---
id: wor-bohh
status: open
deps: [wor-fzu3]
links: []
created: 2026-02-26T19:45:22Z
type: feature
priority: 1
assignee: John Wilkinson
parent: til-lcau
---
# Aggressive off-screen context disposal with hard cap

This is the minimal fix for the "too many WebGL contexts" crash. Enforce a hard cap on simultaneous live contexts (default 8). When the cap is reached, dispose the least-recently-visible tile's context before creating a new one.

## Current behavior

- Each tile gets a context at creation time and keeps it until the tile DOM element is removed
- No cap — 20 tiles means 20 contexts, which exceeds browser limits (8-16)
- `engine.dispose()` exists but is only called on tile deletion, not on visibility changes

## Change

1. Add a lightweight context tracker (e.g. `context-tracker.ts`) that:
   - Maintains a list of active `{ canvas, engine, lastVisible: number }` entries
   - Exposes `register(canvas, engine)`, `unregister(canvas)`, `markVisible(canvas)`
   - On `register`: if `active.length >= MAX_CONTEXTS`, find the entry with the oldest `lastVisible`, call its `engine.dispose()`, remove it, then proceed
2. Wire `createTile` to call `register` after creating a shader engine, and `disposeTile` to call `unregister`
3. Wire fullscreen open/close: on fullscreen open, mark all grid tile contexts as candidates for eviction; on close, re-create contexts for visible tiles (simple — just iterate tiles and call `createShaderEngine` for the first N)
4. `MAX_CONTEXTS` should be a module-level constant, defaulting to 8

The tile whose context was evicted should show a frozen last frame or go blank — crash detection/placeholders are handled in a separate ticket (til-cspg).

## Acceptance Criteria

1. No more than `MAX_CONTEXTS` WebGL contexts exist simultaneously
2. Grid with 20+ tiles does not crash
3. Fullscreen transition recycles grid contexts
4. Evicted tiles stop rendering (blank canvas is acceptable for now; placeholder comes in til-cspg)
5. Tests cover: registering up to cap, eviction on overflow, unregister cleanup
6. Lint passes

