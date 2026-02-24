/**
 * Tiles — WebGL shader composition app
 * Entry point for the frontend.
 */
import "./styles.css";
import { createIndexedDBStorage, type ShaderStorage } from "./storage.js";
import { seedIfEmpty } from "./seed.js";
import { createTile, disposeTile, type TileElement } from "./tile.js";
import { setupTileDragDrop } from "./drag-drop.js";
import { performMerge } from "./merge.js";
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
  teardownDragDrop = setupTileDragDrop(
    tiles.map((t) => t.element),
    {
      async onMergeRequest(sourceId, targetId) {
        if (!store) return;
        const source = tiles.find((t) => t.shader.id === sourceId);
        const target = tiles.find((t) => t.shader.id === targetId);
        if (!source || !target) return;

        const result = await performMerge(source.shader, target.shader, store);
        if (result.success && result.shader) {
          const shaders = await store.getAll();
          renderGrid(shaders);
        }
      },
    }
  );
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
