---
id: wor-0si5
status: open
deps: [wor-oz1c]
links: []
created: 2026-02-27T00:00:29Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-dn2m
---
# Test: navigation state machine (grid → fullscreen → edit → back → grid)

The demo video showed a state desync: the edit view opened after the user had already tried to close fullscreen, and after returning to the grid no tiles were clickable (zombie state). This indicates the navigation state machine (fullscreen overlay present/absent, edit view open/closed, history stack, event listeners) has untested transitions. Add tests that exercise the full lifecycle: (1) start at grid, open fullscreen via tile click, verify overlay; (2) from fullscreen open edit view, verify edit overlay and URL hash ends with /edit; (3) simulate popstate (back) from edit, verify edit view closes and fullscreen remains; (4) simulate popstate (back) from fullscreen, verify overlay removed and grid is restored; (5) verify that fullscreenOverlay is null after close so subsequent openFullscreen calls succeed; (6) verify that the early-return guard in openFullscreen (if fullscreenOverlay return) does not silently swallow legitimate open requests. The test should use history.pushState/popstate simulation since jsdom supports it.

## Acceptance Criteria

Tests pass in CI. Each transition in the grid→fullscreen→edit→back→fullscreen→back→grid cycle is tested. State variables (fullscreenOverlay, edit view presence, URL hash) are asserted at every step. A regression that leaves stale overlays or dangling state causes a test failure.

