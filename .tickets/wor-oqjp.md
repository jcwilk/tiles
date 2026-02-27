---
id: wor-oqjp
status: open
deps: [wor-oz1c]
links: []
created: 2026-02-27T00:00:03Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-dn2m
---
# Test: fullscreen overlay button click handlers fire immediately

In the demo video, clicking the edit (pencil) and close (×) buttons in fullscreen view produced no visible response for ~8 seconds. The buttons eventually fired, but out of order (edit opened after close was attempted). Add Vitest tests in main.test.ts (or a new fullscreen.test.ts) that: (1) construct a minimal tile, call openFullscreen, and verify the overlay and its buttons exist in the DOM; (2) simulate a click on the edit button and assert the edit view opens synchronously or within one microtask; (3) simulate a click on the close button and assert the overlay is removed from the DOM. These tests will require extracting openFullscreen/closeFullscreen into a testable module or testing via DOM side-effects. The goal is to catch regressions where button handlers are never attached, are blocked by long-running tasks, or are intercepted by an overlapping element.

## Acceptance Criteria

Tests pass in CI. Clicking the edit button in fullscreen triggers openEditView. Clicking the close button removes the fullscreen overlay. Both respond within one event loop tick (no async delay). Tests fail if handlers are missing or if overlay z-index/pointer-events block clicks.

