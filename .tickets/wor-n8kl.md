---
id: wor-n8kl
status: open
deps: [wor-xi1c]
links: []
created: 2026-02-26T19:45:24Z
type: feature
priority: 1
assignee: John Wilkinson
parent: til-lcau
---
# WebGLContextPool class with acquire/release API

Consolidate the context tracker, viewport observer, and eviction logic into a single `WebGLContextPool` class with a clean public API.

## Background

After the preceding tickets (shared validation context, disposal cap, viewport observer), the pieces exist but are spread across modules. This ticket unifies them.

## Change

1. Create `frontend/src/webgl-context-pool.ts` exporting a `WebGLContextPool` class:
   - `constructor(options: { maxContexts?: number })` — default 8
   - `acquire(canvas: HTMLCanvasElement): WebGL2RenderingContext | null` — returns a context or null if cap reached and nothing is evictable
   - `release(canvas: HTMLCanvasElement): void` — disposes the context and returns the slot
   - `markVisible(canvas: HTMLCanvasElement): void` / `markOffscreen(canvas: HTMLCanvasElement): void`
   - `dispose(): void` — tears down all contexts and the IntersectionObserver
   - Priority: fullscreen canvas is never evicted; visible tiles are evicted last; off-screen tiles are evicted first (LRU within each tier)
2. Integrate with `tile.ts` and `main.ts` — tiles call `pool.acquire()` / `pool.release()` instead of directly calling `canvas.getContext()`
3. Fullscreen tile calls `pool.markVisible()` with highest priority
4. Device capability detection: on mobile or when `navigator.gpu` reports low limits, reduce `maxContexts` to 4

## Acceptance Criteria

1. `WebGLContextPool` class with acquire/release/markVisible/markOffscreen/dispose API
2. Tiles use the pool instead of direct `getContext` calls
3. Priority system: fullscreen > visible > off-screen (LRU)
4. Mobile detection reduces pool size
5. All existing tests pass; new tests cover pool lifecycle, priority eviction, mobile fallback
6. Lint passes

