/**
 * Viewport-aware context allocation via IntersectionObserver.
 * Drives markVisible/markOffscreen for WebGLContextPool so off-screen tiles
 * are evicted first.
 */
import { getDefaultPool } from "./webgl-context-pool.js";
import type { TileElement } from "./tile.js";

let observer: IntersectionObserver | null = null;
const tileByElement = new WeakMap<Element, TileElement>();
let pendingVisible: Set<TileElement> = new Set();
let pendingStale: Set<TileElement> = new Set();
let pendingScheduled = false;

function flushPending(): void {
  const pool = getDefaultPool();
  if (pendingVisible.size > 0) {
    for (const tile of pendingVisible) {
      const canvas = tile.canvasRef.current;
      if (canvas) pool.markVisible(canvas);
      tile.recreateEngineIfNeeded?.();
    }
    pendingVisible.clear();
  }
  if (pendingStale.size > 0) {
    const canvases: HTMLCanvasElement[] = [];
    for (const tile of pendingStale) {
      const canvas = tile.canvasRef.current;
      if (canvas) canvases.push(canvas);
    }
    if (canvases.length > 0) pool.markOffscreenMany(canvases);
    pendingStale.clear();
  }
  pendingScheduled = false;
}

function scheduleFlush(): void {
  if (pendingScheduled) return;
  pendingScheduled = true;
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => flushPending(), { timeout: 50 });
  } else {
    setTimeout(flushPending, 0);
  }
}

function handleIntersection(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const tile = tileByElement.get(entry.target);
    if (!tile) continue;
    if (entry.isIntersecting) {
      pendingStale.delete(tile);
      pendingVisible.add(tile);
    } else {
      pendingVisible.delete(tile);
      pendingStale.add(tile);
    }
  }
  scheduleFlush();
}

function ensureObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(handleIntersection, {
      threshold: 0,
      rootMargin: "0px",
    });
  }
  return observer;
}

/**
 * Observe a grid tile for viewport visibility. Call when tile is added to grid.
 */
export function observeTile(tile: TileElement): void {
  ensureObserver().observe(tile.element);
  tileByElement.set(tile.element, tile);
}

/**
 * Stop observing a tile. Call when tile is removed from grid.
 */
export function unobserveTile(tile: TileElement): void {
  if (observer) {
    observer.unobserve(tile.element);
  }
  tileByElement.delete(tile.element);
  pendingVisible.delete(tile);
  pendingStale.delete(tile);
}

/**
 * Disconnect the observer. Call when opening fullscreen.
 */
export function disconnectViewportObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  pendingVisible.clear();
  pendingStale.clear();
  pendingScheduled = false;
}

/**
 * Reconnect and observe all given tiles. Call when closing fullscreen.
 */
export function reconnectViewportObserver(tiles: TileElement[]): void {
  const obs = ensureObserver();
  for (const tile of tiles) {
    obs.observe(tile.element);
    tileByElement.set(tile.element, tile);
  }
}
