/**
 * Context tracker: enforces hard cap on WebGL contexts.
 * When cap is reached, evicts the least-recently-visible tile before creating a new one.
 */
import type { ShaderEngine } from "./shader-engine.js";

const MAX_CONTEXTS = 8;

interface Entry {
  canvas: HTMLCanvasElement;
  engine: ShaderEngine;
  lastVisible: number;
  onEvict?: () => void;
}

const entries: Entry[] = [];

function evictOldest(): void {
  if (entries.length === 0) return;
  let oldest = entries[0];
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].lastVisible < oldest.lastVisible) {
      oldest = entries[i];
    }
  }
  oldest.onEvict?.();
  oldest.engine.dispose();
  const idx = entries.indexOf(oldest);
  if (idx >= 0) entries.splice(idx, 1);
}

/**
 * Evict one entry if at cap. Call before creating a new engine.
 */
export function makeRoom(): void {
  while (entries.length >= MAX_CONTEXTS) {
    evictOldest();
  }
}

/**
 * Register a canvas+engine. Call makeRoom() before creating the engine if needed.
 */
export function register(
  canvas: HTMLCanvasElement,
  engine: ShaderEngine,
  onEvict?: () => void
): void {
  entries.push({
    canvas,
    engine,
    lastVisible: Date.now(),
    onEvict,
  });
}

/**
 * Unregister a canvas (e.g. when tile is disposed).
 */
export function unregister(canvas: HTMLCanvasElement): void {
  const idx = entries.findIndex((e) => e.canvas === canvas);
  if (idx >= 0) entries.splice(idx, 1);
}

/**
 * Mark a canvas as recently visible (called when tile enters viewport or gets focus).
 */
export function markVisible(canvas: HTMLCanvasElement): void {
  const entry = entries.find((e) => e.canvas === canvas);
  if (entry) entry.lastVisible = Date.now();
}

/**
 * Mark canvases as stale so they are evicted first when room is needed.
 * Call when opening fullscreen to deprioritize grid tiles.
 */
export function markStale(canvases: HTMLCanvasElement[]): void {
  const set = new Set(canvases);
  for (const e of entries) {
    if (set.has(e.canvas)) e.lastVisible = 0;
  }
}

/**
 * Get current active count (for tests).
 */
export function getActiveCount(): number {
  return entries.length;
}

/**
 * Reset tracker (for tests).
 */
export function resetContextTracker(): void {
  for (const e of entries) {
    e.onEvict?.();
    e.engine.dispose();
  }
  entries.length = 0;
}
