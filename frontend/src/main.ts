/**
 * Tiles — WebGL shader composition app
 * Entry point for the frontend.
 */
import "./styles.css";
import { createIndexedDBStorage, type ShaderStorage } from "./storage.js";
import { seedIfEmpty } from "./seed.js";
import { createTile, createLoadingTile, disposeTile, type TileElement } from "./tile.js";
import { setupTileDragDrop } from "./drag-drop.js";
import { performMerge } from "./merge.js";
import { playMergeConnectionAnimation } from "./merge-connection-animation.js";
import { performAddFromVoice } from "./add-from-voice.js";
import { isBuiltInTile } from "./builtin.js";
import type { ShaderObject } from "./types.js";

const appEl = document.getElementById("app");
if (!appEl) throw new Error("Missing #app");
const app: HTMLElement = appEl;

let tiles: TileElement[] = [];
let fullscreenOverlay: HTMLElement | null = null;
let fullscreenTile: TileElement | null = null;
let teardownDragDrop: (() => void) | null = null;
let storage: ShaderStorage | null = null;

async function removeTile(tile: TileElement): Promise<void> {
  if (isBuiltInTile(tile.shader.id)) return;

  const store = storage;
  if (!store) return;

  const grid = tile.element.parentElement;
  if (!grid) return;

  disposeTile(tile);
  tile.element.remove();

  await store.delete(tile.shader.id);
  tiles = tiles.filter((t) => t.shader.id !== tile.shader.id);

  teardownDragDrop?.();
  const remaining = Array.from(grid.querySelectorAll(".tile"));
  teardownDragDrop = setupTileDragDrop(remaining as HTMLElement[], {
    onMergeRequest: makeMergeHandler(tiles),
  });
}

function makeMergeHandler(currentTiles: TileElement[]) {
  const store = storage;
  return async (sourceId: string, targetId: string) => {
    if (!store || sourceId === "loading" || targetId === "loading") return;
      const source = currentTiles.find((t) => t.shader.id === sourceId);
      const target = currentTiles.find((t) => t.shader.id === targetId);
      if (!source || !target) return;

      const grid = currentTiles[0]?.element.parentElement;
      const targetEl = target.element;
      if (!grid || !targetEl) return;

      const isEdit = sourceId === targetId;
      const loadingTile = createLoadingTile();
      if (isEdit) {
        targetEl.replaceWith(loadingTile);
      } else {
        const insertBefore = targetEl.nextElementSibling;
        if (insertBefore) {
          grid.insertBefore(loadingTile, insertBefore);
        } else {
          grid.appendChild(loadingTile);
        }
      }

      teardownDragDrop?.();
      const allTileEls = Array.from(grid.querySelectorAll(".tile"));
      teardownDragDrop = setupTileDragDrop(allTileEls as HTMLElement[], {
        onMergeRequest: makeMergeHandler(currentTiles),
      });

      // Immediate visual feedback: animate lines from source and target to merge point
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          playMergeConnectionAnimation(
            source.element,
            target.element,
            loadingTile
          );
        });
      });

      const result = await performMerge(source.shader, target.shader, store);

      if (result.success && result.shader) {
        const newTile = createTile(result.shader, {
          onDelete: () => removeTile(newTile),
        });
        newTile.element.classList.add("tile-merge-appear");
        newTile.element.addEventListener("click", () => openFullscreen(newTile));

        const targetIdx = currentTiles.findIndex((t) => t.shader.id === targetId);

        if (isEdit) {
          // Edit: replace loading with updated tile in place
          disposeTile(target);
          loadingTile.replaceWith(newTile.element);
          const updatedTiles = [
            ...currentTiles.slice(0, targetIdx),
            newTile,
            ...currentTiles.slice(targetIdx + 1),
          ];
          tiles = updatedTiles;
        } else {
          // Merge: remove loading, insert new tile after target
          loadingTile.remove();
          const insertBefore = targetEl.nextElementSibling;
          if (insertBefore) {
            grid.insertBefore(newTile.element, insertBefore);
          } else {
            grid.appendChild(newTile.element);
          }
          const updatedTiles = [
            ...currentTiles.slice(0, targetIdx + 1),
            newTile,
            ...currentTiles.slice(targetIdx + 1),
          ];
          tiles = updatedTiles;
        }

        teardownDragDrop?.();
        const allEls = Array.from(grid.querySelectorAll(".tile"));
        teardownDragDrop = setupTileDragDrop(allEls as HTMLElement[], {
          onMergeRequest: makeMergeHandler(tiles),
        });
      } else {
        if (isEdit) {
          loadingTile.replaceWith(targetEl);
        } else {
          loadingTile.remove();
        }
        teardownDragDrop?.();
        const remaining = Array.from(grid.querySelectorAll(".tile"));
        teardownDragDrop = setupTileDragDrop(remaining as HTMLElement[], {
          onMergeRequest: makeMergeHandler(currentTiles),
        });
      }
    };
}

function renderGrid(shaders: ShaderObject[]): void {
  teardownDragDrop?.();

  const grid = document.createElement("div");
  grid.className = "tiles-grid";

  tiles = shaders.map((shader) => {
    const tile = createTile(shader, isBuiltInTile(shader.id) ? {} : { onDelete: () => removeTile(tile) });
    grid.appendChild(tile.element);

    tile.element.addEventListener("click", () => openFullscreen(tile));
    return tile;
  });

  const addBtn = createAddTileButton();
  grid.appendChild(addBtn);

  app.innerHTML = "";
  app.appendChild(grid);

  teardownDragDrop = setupTileDragDrop(tiles.map((t) => t.element), {
    onMergeRequest: makeMergeHandler(tiles),
  });
}

function createAddTileButton(): HTMLElement {
  const btn = document.createElement("button");
  btn.className = "tile tile-add-new";
  btn.setAttribute("aria-label", "Add new tile with voice");
  btn.innerHTML = '<span class="tile-add-icon">+</span><span class="tile-add-label">Add tile</span>';

  btn.addEventListener("click", async () => {
    if (!storage) return;

    btn.disabled = true;
    btn.classList.add("tile-add-loading");
    const label = btn.querySelector(".tile-add-label");
    if (label) label.textContent = "Recording…";

    const result = await performAddFromVoice(storage);

    btn.disabled = false;
    btn.classList.remove("tile-add-loading");
    if (label) label.textContent = "Add tile";

    if (result.success && result.shader) {
      const grid = btn.parentElement;
      if (!grid) return;

      const newTile = createTile(result.shader, {
        onDelete: () => removeTile(newTile),
      });
      newTile.element.classList.add("tile-merge-appear");
      newTile.element.addEventListener("click", () => openFullscreen(newTile));

      grid.insertBefore(newTile.element, btn);
      tiles = [...tiles, newTile];

      teardownDragDrop?.();
      const allEls = Array.from(grid.querySelectorAll(".tile"));
      teardownDragDrop = setupTileDragDrop(allEls as HTMLElement[], {
        onMergeRequest: makeMergeHandler(tiles),
      });
    }
  });

  return btn;
}

function openFullscreen(tile: TileElement): void {
  if (fullscreenOverlay) return;

  const overlay = document.createElement("div");
  overlay.className = "fullscreen";

  const fullscreenTileEl = createTile(tile.shader);
  fullscreenTileEl.element.classList.add("tile");
  fullscreenTileEl.element.addEventListener("click", (e) => e.stopPropagation());

  const closeBtn = document.createElement("button");
  closeBtn.className = "fullscreen-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", closeFullscreen);

  overlay.appendChild(closeBtn);
  overlay.appendChild(fullscreenTileEl.element);

  document.body.appendChild(overlay);
  fullscreenOverlay = overlay;
  fullscreenTile = fullscreenTileEl;

  history.pushState({ fullscreen: tile.shader.id }, "", `#${tile.shader.id}`);
}

function closeFullscreen(): void {
  if (!fullscreenOverlay || !fullscreenTile) return;

  disposeTile(fullscreenTile);
  fullscreenOverlay.remove();
  fullscreenOverlay = null;
  fullscreenTile = null;

  history.replaceState({}, "", window.location.pathname + window.location.search);
}

function handlePopState(): void {
  if (fullscreenOverlay) {
    closeFullscreen();
  }
}

async function init(): Promise<void> {
  storage = createIndexedDBStorage();
  await seedIfEmpty(storage);
  const shaders = await storage.getAll();

  renderGrid(shaders);

  window.addEventListener("popstate", handlePopState);

  if (window.location.hash) {
    const id = window.location.hash.slice(1);
    const tile = tiles.find((t) => t.shader.id === id);
    if (tile) openFullscreen(tile);
  }
}

init().catch(console.error);
