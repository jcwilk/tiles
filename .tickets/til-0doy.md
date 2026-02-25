---
id: til-0doy
status: open
deps: []
links: []
created: 2026-02-25T02:12:31Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Newest-first tile ordering

Change tile insertion in frontend/src/main.ts so new shaders (from merge, voice, and future directive results) are always prepended to the beginning of the grid and tiles array instead of being inserted after the target or before the add button. Affects: makeMergeHandler merge result (line ~117-128), voice result in createAddTileButton (line ~235).

## Acceptance Criteria

New tiles from merge appear at the start of the grid. New tiles from voice input appear at the start of the grid. The add-tile button remains at the end. Existing tiles maintain their relative order.

