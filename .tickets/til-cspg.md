---
id: til-cspg
status: open
deps: [til-lcau]
links: []
created: 2026-02-26T00:25:32Z
type: feature
priority: 1
assignee: John Wilkinson
parent: til-n5ip
---
# WebGL crash detection and graceful fallback placeholders

There is currently no handling for when WebGL contexts are lost (crash). When a context is lost (due to resource exhaustion, GPU driver issues, or OS reclamation), the tile just goes black or displays garbage with no recovery path. Users have no indication of what happened.

## Current behavior:
- `shader-engine.ts` checks for WebGL2 support at creation time but does not listen for context loss events
- No `webglcontextlost` / `webglcontextrestored` event listeners
- No visual fallback when a context dies
- User has to reload the page to recover

## Desired behavior:
1. **Detect context loss** — Listen for `webglcontextlost` on every canvas. When fired, mark the tile as 'crashed'.
2. **Show placeholder** — Replace the broken canvas with a visual placeholder (e.g., a static thumbnail of the last good frame, or a styled div with a 'paused' indicator and the tile's directive text).
3. **Recover on interaction** — When the user clicks/taps a crashed tile, attempt to restore the WebGL context. If the context pool (from the pooling ticket) has capacity, re-acquire a context and restart the shader.
4. **Automatic recovery** — When context pool frees up (e.g., user scrolls and other tiles release contexts), automatically try to restore crashed tiles that are in the viewport.
5. **User feedback** — Brief toast or visual cue when tiles are paused due to resource limits ('Some tiles paused to save resources' or similar).

## Technical approach:
- Add `webglcontextlost` and `webglcontextrestored` event listeners in `shader-engine.ts` or `tile.ts`
- Capture last rendered frame as a data URL or ImageBitmap before context loss (if possible) or on a periodic basis
- Integrate with the context pool (depends on WebGL context pooling ticket)

## Testing strategy:
- Simulate context loss via `WEBGL_lose_context` extension (`gl.getExtension('WEBGL_lose_context').loseContext()`)
- Test placeholder display
- Test recovery after simulated restore
- Test interaction-triggered recovery

## Design

1. Add webglcontextlost/restored listeners to ShaderEngine
2. Periodically snapshot last good frame (e.g., every 5s or on pause)
3. On loss: swap canvas for placeholder image + 'click to resume' overlay
4. On click: request context from pool, rebuild shader engine
5. Integrate with IntersectionObserver from pooling ticket for auto-recovery

## Acceptance Criteria

1. Context loss is detected and handled gracefully (no black screens or errors)
2. Placeholder shown with last-good-frame snapshot or styled fallback
3. User can click to recover a paused tile
4. Automatic recovery when resources free up
5. Context loss can be simulated in tests via WEBGL_lose_context
6. All tests pass, no console errors on context loss

