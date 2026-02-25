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
import { openEditView, closeEditView } from "./edit-view.js";
import type { ShaderObject } from "./types.js";

const appEl = document.getElementById("app");
if (!appEl) throw new Error("Missing #app");
const app: HTMLElement = appEl;

let tiles: TileElement[] = [];
let fullscreenOverlay: HTMLElement | null = null;
let fullscreenTile: TileElement | null = null;
let editViewOverlay: HTMLElement | null = null;
let teardownDragDrop: (() => void) | null = null;
let storage: ShaderStorage | null = null;

async function removeTile(tile: TileElement): Promise<void> {
  if (isBuiltInTile(tile.shader)) return;

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
        newTile.element.addEventListener("click", (e) => {
          if ((e.target as HTMLElement).closest?.(".tile-delete")) return;
          openFullscreen(newTile);
        });

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
          // Merge: remove loading, prepend new tile at start of grid (newest-first)
          loadingTile.remove();
          grid.insertBefore(newTile.element, grid.firstElementChild);
          tiles = [newTile, ...currentTiles];
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
    const tile = createTile(shader, isBuiltInTile(shader) ? {} : { onDelete: () => removeTile(tile) });
    grid.appendChild(tile.element);

    tile.element.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest?.(".tile-delete")) return;
      openFullscreen(tile);
    });
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

  let currentStop: (() => void) | null = null;

  btn.addEventListener("click", async () => {
    if (!storage) return;

    // Tap-to-stop: if already recording/processing, stop and do not start new
    if (currentStop) {
      currentStop();
      return;
    }

    const label = btn.querySelector(".tile-add-label");
    const icon = btn.querySelector(".tile-add-icon");

    // Recording phase: show tap-to-stop, keep clickable
    btn.classList.add("tile-add-recording");
    if (label) label.textContent = "Tap to stop";
    if (icon) icon.textContent = "●";

    const { promise, stop } = performAddFromVoice(storage, {
      onRecordingEnded: () => {
        // Processing phase: disable interaction, show processing state
        btn.classList.add("tile-add-loading");
        btn.disabled = true;
        if (label) label.textContent = "Processing…";
      },
    });
    currentStop = stop;

    const result = await promise.finally(() => {
      currentStop = null;
      btn.classList.remove("tile-add-recording", "tile-add-loading");
      btn.disabled = false;
      if (label) label.textContent = "Add tile";
      if (icon) icon.textContent = "+";
    });

    if (result.success && result.shader) {
      const grid = btn.parentElement;
      if (!grid) return;

      const newTile = createTile(result.shader, {
        onDelete: () => removeTile(newTile),
      });
      newTile.element.classList.add("tile-merge-appear");
      newTile.element.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest?.(".tile-delete")) return;
        openFullscreen(newTile);
      });

      grid.insertBefore(newTile.element, grid.firstElementChild);
      tiles = [newTile, ...tiles];

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
  closeBtn.addEventListener("click", () => history.back());

  const editBtn = document.createElement("button");
  editBtn.className = "fullscreen-close";
  editBtn.setAttribute("aria-label", "Edit");
  editBtn.textContent = "✎";
  editBtn.style.cssText = "top: 0.5rem; right: 3rem;";
  editBtn.addEventListener("click", () => {
    if (!storage) return;
    openEditView(tile.shader, tiles.map((t) => t.shader), storage, {
      onNewShader: (newShader) => {
        closeFullscreen();
        const newTile = createTile(newShader, {
          onDelete: () => removeTile(newTile),
        });
        newTile.element.classList.add("tile-merge-appear");
        newTile.element.addEventListener("click", (e) => {
          if ((e.target as HTMLElement).closest?.(".tile-delete")) return;
          openFullscreen(newTile);
        });
        const grid = document.querySelector(".tiles-grid");
        if (grid) {
          grid.insertBefore(newTile.element, grid.firstElementChild);
          tiles = [newTile, ...tiles];
          teardownDragDrop?.();
          const allEls = Array.from(grid.querySelectorAll(".tile"));
          teardownDragDrop = setupTileDragDrop(allEls as HTMLElement[], {
            onMergeRequest: makeMergeHandler(tiles),
          });
        }
        openFullscreen(newTile);
      },
      onMount: (el) => {
        editViewOverlay = el;
      },
      onUnmount: () => {
        editViewOverlay = null;
      },
    });
  });

  overlay.appendChild(closeBtn);
  overlay.appendChild(editBtn);
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
  const hash = window.location.hash;
  const isEditHash = /^#([^/]+)\/edit$/.test(hash);

  if (editViewOverlay && !isEditHash) {
    closeEditView();
  }
  if (fullscreenOverlay && !hash) {
    closeFullscreen();
  }
}

/** Called when navigating to edit view. Overridden by edit view wiring (til-hq81). */
export function setEditViewOverlay(el: HTMLElement | null): void {
  editViewOverlay = el;
}

async function init(): Promise<void> {
  storage = createIndexedDBStorage();
  await seedIfEmpty(storage);
  const shaders = await storage.getAll();

  renderGrid(shaders);

  window.addEventListener("popstate", handlePopState);

  if (window.location.hash) {
    const hash = window.location.hash;
    const editMatch = hash.match(/^#([^/]+)\/edit$/);
    const idMatch = hash.match(/^#([^/]+)$/);

    if (editMatch) {
      const id = editMatch[1];
      const tile = tiles.find((t) => t.shader.id === id);
      if (tile && storage) {
        openFullscreen(tile);
        openEditView(tile.shader, tiles.map((t) => t.shader), storage, {
          onNewShader: (newShader) => {
            closeFullscreen();
            const newTile = createTile(newShader, {
              onDelete: () => removeTile(newTile),
            });
            newTile.element.classList.add("tile-merge-appear");
            newTile.element.addEventListener("click", (e) => {
              if ((e.target as HTMLElement).closest?.(".tile-delete")) return;
              openFullscreen(newTile);
            });
            const grid = document.querySelector(".tiles-grid");
            if (grid) {
              grid.insertBefore(newTile.element, grid.firstElementChild);
              tiles = [newTile, ...tiles];
              teardownDragDrop?.();
              const allEls = Array.from(grid.querySelectorAll(".tile"));
              teardownDragDrop = setupTileDragDrop(allEls as HTMLElement[], {
                onMergeRequest: makeMergeHandler(tiles),
              });
            }
            openFullscreen(newTile);
          },
          onMount: (el) => {
            editViewOverlay = el;
          },
          onUnmount: () => {
            editViewOverlay = null;
          },
        });
      }
    } else if (idMatch) {
      const id = idMatch[1];
      const tile = tiles.find((t) => t.shader.id === id);
      if (tile) openFullscreen(tile);
    }
  }
}

init().catch(console.error);
