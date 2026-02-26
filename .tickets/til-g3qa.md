---
id: til-g3qa
status: open
deps: []
links: []
created: 2026-02-26T00:25:45Z
type: bug
priority: 1
assignee: John Wilkinson
parent: til-n5ip
---
# Fix: edited/remixed tile should open full-screen after creation

When a user edits a tile (applies a directive or selects a suggestion), the resulting new tile should appear full-screen immediately so the user can see the result of their edit. This is currently not working correctly — the behavior is confusing and the user doesn't clearly see the output of their edit.

## Expected flow:
1. User opens a tile full-screen
2. User clicks edit (✎) to open edit view
3. User applies a directive or selects a suggestion
4. Edit view closes
5. **New tile appears full-screen** so the user can inspect the result
6. User can then go back to grid view

## Current code path (main.ts ~lines 265-285):
The `onNewShader` callback in `openEditView()` does:
1. Creates new tile
2. Inserts at start of grid
3. Calls `openFullscreen(newTile)`

But something in this flow is broken — possibly:
- The fullscreen overlay from the edit view isn't being properly cleaned up before the new fullscreen opens
- Hash-based navigation state is conflicting (the edit view uses `#id/edit`, fullscreen uses `#id`)
- The popstate listener may be interfering with the new fullscreen push
- Race condition between closeEditView() and openFullscreen()

## Investigation areas:
- `main.ts`: `openEditView()` callback, `openFullscreen()`, `closeFullscreen()`, `closeEditView()`
- `edit-view.ts`: `applyDirectiveAndUpdate()` and its callback chain
- Hash/history state management in `main.ts` (popstate listener, pushState calls)
- Timing of DOM operations (overlay removal vs creation)

## Verification:
- Open a tile full-screen → edit → apply directive → new tile should appear full-screen
- Open a tile full-screen → edit → select suggestion → new tile should appear full-screen
- Browser back button should work correctly through the full flow
- Hash URL should reflect the new tile's ID

## Acceptance Criteria

1. After applying a directive or selecting a suggestion, the new tile appears full-screen
2. Edit view is properly closed before new fullscreen opens
3. Browser back navigation works correctly through the edit → new tile flow
4. Hash-based URLs are correct at each step
5. No visual glitches during the transition
6. Tests cover the edit → fullscreen flow

