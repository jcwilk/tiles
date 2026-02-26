---
id: til-lcau
status: open
deps: []
links: []
created: 2026-02-26T00:25:15Z
type: epic
priority: 1
assignee: John Wilkinson
---
# Epic: WebGL Context Management

Browsers enforce hard limits on concurrent WebGL contexts (typically 8-16). The app currently creates one context per tile with no pooling, disposal, or crash recovery — causing crashes on grids with many tiles and black screens on context loss.

This epic decomposes the work into incremental, independently shippable tickets ordered from highest-impact/lowest-effort to most complex.

## Delivery order

1. **Shared validation context** — single offscreen context for shader compilation checks (eliminates throwaway temp canvases in merge/apply-directive)
2. **Aggressive off-screen disposal** — hard-cap active contexts; dispose off-screen tiles first (fixes the crash without a full pool abstraction)
3. **Context loss detection & placeholders** — `webglcontextlost`/`webglcontextrestored` listeners, placeholder UI, click-to-recover (standalone, no pool dependency)
4. **Viewport-aware allocation via IntersectionObserver** — observe tile visibility, allocate/release contexts based on viewport
5. **Context pool class** — formal acquire/release pool integrating disposal, viewport awareness, and priority (fullscreen > visible > off-screen)

