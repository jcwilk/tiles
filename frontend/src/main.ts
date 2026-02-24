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
import type { ShaderObject } from "./types.js";

const appEl = document.getElementById("app");
if (!appEl) throw new Error("Missing #app");
const app: HTMLElement = appEl;

let tiles: TileElement[] = [];
let fullscreenOverlay: HTMLElement | null = null;
let fullscreenTile: TileElement | null = null;
let teardownDragDrop: (() => void) | null = null;
let storage: ShaderStorage | null = null;

function renderGrid(shaders: ShaderObject[]): void {
  teardownDragDrop?.();

  const grid = document.createElement("div");
  grid.className = "tiles-grid";

  tiles = shaders.map((shader) => {
    const tile = createTile(shader);
    grid.appendChild(tile.element);

    tile.element.addEventListener("click", () => openFullscreen(tile));
    return tile;
  });

  app.innerHTML = "";
  app.appendChild(grid);

  const store = storage;
  function makeMergeHandler(currentTiles: TileElement[]) {
    return async (sourceId: string, targetId: string) => {
      if (!store || sourceId === "loading" || targetId === "loading") return;
      const source = currentTiles.find((t) => t.shader.id === sourceId);
      const target = currentTiles.find((t) => t.shader.id === targetId);
      if (!source || !target) return;

      const grid = currentTiles[0]?.element.parentElement;
      const targetEl = target.element;
      if (!grid || !targetEl) return;

      const loadingTile = createLoadingTile();
      const insertBefore = targetEl.nextElementSibling;
      if (insertBefore) {
        grid.insertBefore(loadingTile, insertBefore);
      } else {
        grid.appendChild(loadingTile);
      }

      teardownDragDrop?.();
      const allTileEls = Array.from(grid.querySelectorAll(".tile"));
      teardownDragDrop = setupTileDragDrop(allTileEls as HTMLElement[], {
        onMergeRequest: makeMergeHandler(currentTiles),
      });

      const result = await performMerge(source.shader, target.shader, store);
      loadingTile.remove();

      if (result.success && result.shader) {
        const newTile = createTile(result.shader);
        newTile.element.classList.add("tile-merge-appear");
        newTile.element.addEventListener("click", () => openFullscreen(newTile));

        const insertBefore = targetEl.nextElementSibling;
        if (insertBefore) {
          grid.insertBefore(newTile.element, insertBefore);
        } else {
          grid.appendChild(newTile.element);
        }

        const targetIdx = currentTiles.findIndex((t) => t.shader.id === targetId);
        const updatedTiles = [
          ...currentTiles.slice(0, targetIdx + 1),
          newTile,
          ...currentTiles.slice(targetIdx + 1),
        ];
        tiles = updatedTiles;

        teardownDragDrop?.();
        const allEls = Array.from(grid.querySelectorAll(".tile"));
        teardownDragDrop = setupTileDragDrop(allEls as HTMLElement[], {
          onMergeRequest: makeMergeHandler(updatedTiles),
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            playMergeConnectionAnimation(
              source.element,
              target.element,
              newTile.element
            );
          });
        });
      } else {
        teardownDragDrop?.();
        const remaining = Array.from(grid.querySelectorAll(".tile"));
        teardownDragDrop = setupTileDragDrop(remaining as HTMLElement[], {
          onMergeRequest: makeMergeHandler(currentTiles),
        });
      }
    };
  }

  teardownDragDrop = setupTileDragDrop(tiles.map((t) => t.element), {
    onMergeRequest: makeMergeHandler(tiles),
  });
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
