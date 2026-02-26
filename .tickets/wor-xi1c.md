---
id: wor-xi1c
status: closed
deps: [wor-bohh]
links: []
created: 2026-02-26T19:45:22Z
type: feature
priority: 1
assignee: John Wilkinson
parent: til-lcau
---
# Viewport-aware context allocation via IntersectionObserver

Replace the timestamp-based eviction heuristic from the disposal ticket (wor-bohh) with an IntersectionObserver that accurately tracks which tiles are in the viewport.

## Current state (after wor-bohh)

- A context tracker enforces a hard cap
- Eviction uses `lastVisible` timestamps, which are only updated on explicit calls
- Tiles that scroll off-screen keep their context until the cap forces eviction

## Change

1. Create an IntersectionObserver (threshold 0) that watches every tile's root element
2. On intersect (visible): call `contextTracker.markVisible(canvas)` and, if the tile has no context, attempt to acquire one (evicting least-recently-visible if needed)
3. On un-intersect (off-screen): mark as off-screen candidate; do not immediately dispose (keeps animation smooth during fast scrolling), but make it first in line for eviction
4. On fullscreen open: disconnect the observer (all grid tiles become off-screen candidates). On fullscreen close: reconnect.
5. Consider `requestAnimationFrame` throttling for tiles near the viewport edge to reduce GPU load

## Performance targets

- Scrolling a grid of 30+ tiles should not trigger a cascade of create/dispose thrashing
- Debounce or batch allocation changes (e.g. `requestIdleCallback` or `setTimeout(0)` after intersection callbacks settle)

## Acceptance Criteria

1. IntersectionObserver drives context allocation for grid tiles
2. Off-screen tiles release contexts (or are first to be evicted)
3. Scrolling 30+ tiles does not crash or cause visible thrashing
4. Fullscreen transitions properly pause/resume the observer
5. Tests cover: intersection triggers allocation, un-intersection marks evictable, fast scroll does not thrash
6. Lint passes

