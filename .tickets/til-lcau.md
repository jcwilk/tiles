---
id: til-lcau
status: open
deps: []
links: []
created: 2026-02-26T00:25:15Z
type: feature
priority: 1
assignee: John Wilkinson
parent: til-n5ip
---
# WebGL context pooling and lifecycle recycling

WebGL contexts are currently created one-per-tile with no pooling or recycling. When many tiles are visible (especially on the grid view), this leads to crashes because browsers enforce hard limits on concurrent WebGL contexts (typically 8-16 depending on browser/OS). When you zoom into a tile, a new WebGL context is created without cleaning up the old one.

## Current behavior (shader-engine.ts):
- `createShaderEngine(canvas)` creates a new WebGL2 context per canvas via `canvas.getContext('webgl2', ...)`
- Each tile in `tile.ts` gets its own canvas and its own context
- `engine.dispose()` exists but is not called aggressively enough during grid navigation
- Temp canvases are created in `merge.ts` and `apply-directive.ts` for validation (1x1 canvases) — these should also be pooled or shared

## Desired behavior:
1. **Context pool** — Maintain a fixed pool of WebGL2 contexts (e.g., max 6-8). Reuse contexts when tiles enter/leave the viewport.
2. **Viewport-aware rendering** — Only allocate contexts to tiles that are currently visible. Tiles scrolled out of view should release their context back to the pool.
3. **Priority system** — Fullscreen tile gets highest priority. Visible grid tiles get contexts based on proximity to viewport center. Off-screen tiles render nothing (or show a static thumbnail/placeholder).
4. **Cleanup on zoom** — When entering fullscreen, aggressively dispose grid tile contexts. When returning to grid, re-allocate as needed.
5. **Shared validation context** — Use a single offscreen context for shader compilation validation instead of creating temp canvases.

## Performance targets:
- Grid view with 20+ tiles should not crash
- Smooth transition between grid and fullscreen
- Works on mobile devices (which have stricter WebGL limits)

## Design considerations:
- Need to balance between 'lots of animated tiles to watch and enjoy' vs 'overwhelming the device'
- Consider using `requestAnimationFrame` throttling for non-focused tiles
- Consider rendering at reduced resolution for grid tiles
- May need device capability detection (mobile vs desktop context limits)

## Design

Implement a WebGLContextPool class that:
1. Tracks active contexts with a max limit (configurable, default 8)
2. Provides acquire(canvas)/release(canvas) API
3. Uses IntersectionObserver for viewport-aware allocation
4. Integrates with existing ShaderEngine dispose/create lifecycle
5. Falls back to static screenshots for tiles that can't get a context

## Acceptance Criteria

1. WebGL context pool implemented with configurable max limit
2. Viewport-aware rendering — only visible tiles get contexts
3. Grid with 20+ tiles does not crash WebGL
4. Fullscreen transition properly recycles grid contexts
5. Validation uses shared offscreen context
6. Tests cover pool allocation, release, and overflow behavior
7. Works on mobile (tested with reduced context limits)

