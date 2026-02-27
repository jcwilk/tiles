---
id: wor-oz1c
status: open
deps: []
links: []
created: 2026-02-27T00:01:11Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-dn2m
---
# Refactor: extract fullscreen/navigation logic into testable module

The fullscreen overlay logic (openFullscreen, closeFullscreen, handlePopState, fullscreenOverlay state) currently lives inline in main.ts as module-level closures, making it impossible to unit test without initializing the entire app. The other test tickets in this epic require calling these functions directly. Extract the fullscreen state machine into a dedicated module (e.g. fullscreen.ts) with exported functions: openFullscreen(tile), closeFullscreen(), isFullscreenOpen(), and a handlePopState handler. The module should accept its dependencies (DOM container, onEdit callback, onClose callback) via an init function or constructor, following the same pattern edit-view.ts uses. main.ts imports and wires them. This is a prerequisite for all the test tickets in this epic.

## Acceptance Criteria

openFullscreen, closeFullscreen, isFullscreenOpen are importable from fullscreen.ts. main.ts delegates to this module. All existing tests and lint pass. No behavioral change.

