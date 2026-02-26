---
id: til-cspg
status: open
deps: []
links: [til-lcau]
created: 2026-02-26T00:25:32Z
type: feature
priority: 1
assignee: John Wilkinson
parent: til-lcau
---
# WebGL crash detection and graceful fallback placeholders

There is currently no handling for when WebGL contexts are lost. When a context is lost (resource exhaustion, GPU driver issues, OS reclamation), the tile goes black with no recovery path. This ticket adds detection, a placeholder, and click-to-recover — all standalone, no pool dependency.

## Current behavior

- `shader-engine.ts` checks for WebGL2 support at creation time but never listens for `webglcontextlost` / `webglcontextrestored`
- No visual fallback when a context dies
- User must reload the page

## Change

1. **Detect context loss** — add `webglcontextlost` and `webglcontextrestored` event listeners on every tile canvas (in `shader-engine.ts` or `tile.ts`). Call `e.preventDefault()` in the loss handler so the browser allows later restoration.
2. **Snapshot on idle** — capture a single `canvas.toDataURL()` when the tile first renders successfully (or on dispose). Do NOT snapshot periodically on a timer — one snapshot per tile lifetime is enough and avoids the performance cost of repeated `toDataURL` on 20+ canvases.
3. **Show placeholder on loss** — swap the canvas for an `<img>` of the last-good snapshot (or a styled "paused" div if no snapshot exists). Overlay a "click to resume" affordance.
4. **Click-to-recover** — on click, call `WEBGL_lose_context.restoreContext()` if available, or re-create the shader engine from scratch. If context creation fails (cap reached), show a toast ("Too many active shaders — close some tiles").
5. **No automatic pool-based recovery** — that will be wired in when the context pool (wor-n8kl) ships. This ticket only handles manual click-to-recover.

## Testing strategy

- Simulate context loss via `gl.getExtension('WEBGL_lose_context').loseContext()`
- Verify placeholder appears
- Simulate restore via `restoreContext()`, verify tile recovers
- Verify click-to-recover path
- Verify no console errors on loss/restore cycle

## Acceptance Criteria

1. `webglcontextlost` is detected and handled (no black screens, no console errors)
2. Placeholder shown with last-good-frame snapshot or styled fallback
3. User can click a paused tile to attempt recovery
4. Recovery failure shows user feedback (toast)
5. Context loss can be simulated in tests via `WEBGL_lose_context`
6. All tests pass, lint passes

