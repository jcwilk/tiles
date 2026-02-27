---
id: wor-rxog
status: open
deps: [wor-oz1c, wor-0si5]
links: []
created: 2026-02-27T00:00:42Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-dn2m
---
# Test: grid tile click handlers survive fullscreen open/close cycle

After returning from fullscreen to the grid in the demo video, clicking any tile (Stripes, Rainbow, Plasma) produced no response — the app was in a zombie state where event listeners appeared dead. Add a test that: (1) initializes the grid with multiple tiles; (2) clicks a tile to open fullscreen; (3) closes fullscreen (via close button or popstate); (4) clicks a different tile and asserts fullscreen opens for that tile. This tests that closeFullscreen does not accidentally remove or break tile click handlers on the grid, and that no lingering invisible overlay is capturing clicks. Also test the case where the user goes grid→fullscreen→edit→back→back→grid and then clicks a tile.

## Acceptance Criteria

Tests pass in CI. After every fullscreen close (via button or popstate), tile click handlers remain functional. Clicking a tile after returning to grid successfully opens a new fullscreen. No invisible overlays block clicks.

