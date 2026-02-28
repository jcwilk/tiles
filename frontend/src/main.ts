/**
 * Tiles — WebGL shader composition app
 * Entry point for the frontend.
 */
import "./styles.css";
import { createIndexedDBStorage, type ShaderStorage } from "./storage.js";
import { seedIfEmpty } from "./seed.js";
import { createTile, disposeTile, type TileElement } from "./tile.js";
import { getDefaultPool } from "./webgl-context-pool.js";
import {
  observeTile,
  unobserveTile,
  disconnectViewportObserver,
  reconnectViewportObserver,
} from "./viewport-observer.js";
import { performAddFromPrompt } from "./add-from-prompt.js";
import { isBuiltInTile } from "./builtin.js";
import { openEditView, closeEditView } from "./edit-view.js";
import { isDeleteOrControlClick } from "./click-utils.js";
import type { ShaderObject } from "./types.js";

const appEl = document.getElementById("app");
if (!appEl) throw new Error("Missing #app");
const app: HTMLElement = appEl;

let tiles: TileElement[] = [];
let fullscreenOverlay: HTMLElement | null = null;
let fullscreenTile: TileElement | null = null;
let editViewOverlay: HTMLElement | null = null;
let storage: ShaderStorage | null = null;

async function removeTile(tile: TileElement): Promise<void> {
  if (isBuiltInTile(tile.shader)) return;

  const store = storage;
  if (!store) return;

  const grid = tile.element.parentElement;
  if (!grid) return;

  unobserveTile(tile);
  disposeTile(tile);
  tile.element.remove();

  await store.delete(tile.shader.id);
  tiles = tiles.filter((t) => t.shader.id !== tile.shader.id);
}

function handleNewShaderFromEdit(newShader: ShaderObject): void {
  closeEditView();
  closeFullscreen();
  const newTile = createTile(newShader, {
    onDelete: () => removeTile(newTile),
  });
  newTile.element.classList.add("tile-merge-appear");
  newTile.element.addEventListener("click", (e) => {
    if (isDeleteOrControlClick(e)) return;
    openFullscreen(newTile);
  });
  const grid = document.querySelector(".tiles-grid");
  if (grid) {
    grid.insertBefore(newTile.element, grid.firstElementChild);
    tiles = [newTile, ...tiles];
    observeTile(newTile);
  }
  requestAnimationFrame(() => openFullscreen(newTile));
}

function renderGrid(shaders: ShaderObject[]): void {
  disconnectViewportObserver();

  const grid = document.createElement("div");
  grid.className = "tiles-grid";

  tiles = shaders.map((shader) => {
    const tile = createTile(shader, isBuiltInTile(shader) ? {} : { onDelete: () => removeTile(tile) });
    grid.appendChild(tile.element);

    tile.element.addEventListener("click", (e) => {
      if (isDeleteOrControlClick(e)) return;
      openFullscreen(tile);
    });
    return tile;
  });

  const addBtn = createAddTileButton();
  grid.appendChild(addBtn);

  app.innerHTML = "";
  app.appendChild(grid);

  reconnectViewportObserver(tiles);
}

function createAddTileButton(): HTMLElement {
  const btn = document.createElement("button");
  btn.className = "tile tile-add-new";
  btn.setAttribute("aria-label", "Add new tile");
  btn.innerHTML = '<span class="tile-add-icon">+</span><span class="tile-add-label">Add tile</span>';

  btn.addEventListener("click", async () => {
    if (!storage) return;

    const prompt = window.prompt("Describe your shader (e.g. blue gradient, red plasma)");
    if (!prompt?.trim()) return;

    const label = btn.querySelector(".tile-add-label");
    const icon = btn.querySelector(".tile-add-icon");
    btn.classList.add("tile-add-loading");
    btn.disabled = true;
    if (label) label.textContent = "Processing…";

    const result = await performAddFromPrompt(prompt.trim(), storage);

    btn.classList.remove("tile-add-loading");
    btn.disabled = false;
    if (label) label.textContent = "Add tile";
    if (icon) icon.textContent = "+";

    if (result.success && result.shader) {
      const grid = btn.parentElement;
      if (!grid) return;

      const newTile = createTile(result.shader, {
        onDelete: () => removeTile(newTile),
      });
      newTile.element.classList.add("tile-merge-appear");
      newTile.element.addEventListener("click", (e) => {
        if (isDeleteOrControlClick(e)) return;
        openFullscreen(newTile);
      });

      grid.insertBefore(newTile.element, grid.firstElementChild);
      tiles = [newTile, ...tiles];
      observeTile(newTile);
    }
  });

  return btn;
}

function openFullscreen(tile: TileElement): void {
  if (fullscreenOverlay) return;

  disconnectViewportObserver();
  const gridCanvases = tiles
    .map((t) => t.canvasRef.current)
    .filter((c): c is HTMLCanvasElement => c !== null);
  getDefaultPool().markOffscreenMany(gridCanvases);

  const overlay = document.createElement("div");
  overlay.className = "fullscreen";

  const fullscreenTileEl = createTile(tile.shader);
  fullscreenTileEl.element.classList.add("tile");
  fullscreenTileEl.element.addEventListener("click", (e) => e.stopPropagation());
  if (fullscreenTileEl.canvasRef.current) {
    getDefaultPool().markFullscreen(fullscreenTileEl.canvasRef.current);
  }

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
      onNewShader: handleNewShaderFromEdit,
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

  reconnectViewportObserver(tiles);
  for (const t of tiles) {
    t.recreateEngineIfNeeded?.();
  }

  history.replaceState({}, "", window.location.pathname + window.location.search);
}

function handlePopState(): void {
  const hash = window.location.hash;
  const isEditHash = /^#([^/]+)\/edit$/.test(hash);
  const fullscreenId = fullscreenTile?.shader.id;
  const hashMatchesFullscreen =
    fullscreenId &&
    (hash === `#${fullscreenId}` || hash === `#${fullscreenId}/edit`);

  if (editViewOverlay && !isEditHash) {
    closeEditView();
  }
  if (fullscreenOverlay && !hashMatchesFullscreen) {
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
    const hash = window.location.hash;
    const editMatch = hash.match(/^#([^/]+)\/edit$/);
    const idMatch = hash.match(/^#([^/]+)$/);

    if (editMatch) {
      const id = editMatch[1];
      const tile = tiles.find((t) => t.shader.id === id);
      if (tile && storage) {
        openFullscreen(tile);
        openEditView(tile.shader, tiles.map((t) => t.shader), storage, {
          onNewShader: handleNewShaderFromEdit,
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
