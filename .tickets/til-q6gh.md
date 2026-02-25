---
id: til-q6gh
status: closed
deps: []
links: []
created: 2026-02-25T02:11:57Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Unified navigation: X = history.back()

Change the fullscreen close button (X) to call history.back() instead of closeFullscreen() directly. Extend handlePopState to detect #id/edit hash transitions and tear down the edit view. Parse #id/edit on page load to restore the edit view directly. This unifies navigation so X always goes back regardless of view depth (grid, fullscreen, edit).

## Design

In frontend/src/main.ts: (1) Change closeBtn click handler from closeFullscreen() to history.back(). (2) In handlePopState, check current hash — if transitioning away from #id/edit, tear down edit view; if transitioning away from #id, tear down fullscreen. (3) In init(), parse hash for /edit suffix and open edit view directly.

## Acceptance Criteria

X button in fullscreen calls history.back(). Navigating back from #id/edit returns to #id fullscreen. Navigating back from #id returns to grid. Direct URL load of #id/edit opens edit view.

