---
id: til-g3qa
status: open
deps: []
links: [til-1j5x]
created: 2026-02-26T00:25:45Z
type: bug
priority: 1
assignee: John Wilkinson
---
# Fix: edited/remixed tile should open full-screen after creation

After applying a directive or selecting a suggestion in the edit view, the new tile should appear fullscreen. The intent is already coded (`openFullscreen(newTile)` on line 285) but the transition is broken.

## Existing code path (main.ts lines 265-285)

The `onNewShader` callback does:
1. `closeFullscreen()` — disposes the previous fullscreen tile, removes overlay, calls `history.replaceState` to clear the hash
2. Creates new tile, inserts at grid start
3. `openFullscreen(newTile)` — creates a new fullscreen overlay, calls `history.pushState` with new hash

The code is correct in intent. The bug is in the interaction between edit-view teardown and fullscreen lifecycle.

## Likely root causes

1. **Edit view overlay still on top**: `onNewShader` calls `closeFullscreen()` but does NOT call `closeEditView()`. If the edit view overlay is still in the DOM when `openFullscreen(newTile)` creates the new fullscreen overlay, the edit view sits on top and hides it. Check whether `edit-view.ts` closes itself after firing `onNewShader`, or whether the caller is responsible.
2. **`openFullscreen` early-return guard**: line 242 checks `if (fullscreenOverlay) return;`. If `closeFullscreen()` fails to null out `fullscreenOverlay` before `openFullscreen` runs (shouldn't happen synchronously, but verify), the new fullscreen is silently skipped.
3. **`handlePopState` interference**: `closeFullscreen()` calls `history.replaceState`, which does NOT trigger `popstate`. But if the edit view's own history management (e.g. `#id/edit` → `#id` transition) triggers a `popstate`, `handlePopState` could call `closeFullscreen()` on the newly opened fullscreen.

## Reproduction steps (step 1)

1. Run `npm run dev`, open `http://localhost:5173`
2. Click any tile to open fullscreen
3. Click the edit button (✎) to open the edit view
4. Enter a directive (e.g. "make it red") and submit — requires Cloudflare AI credentials
5. Observe: does the new tile appear fullscreen? Or does the user land on the grid?
6. Check DevTools console for errors
7. Check the URL hash — does it update to the new tile's ID?

**Note**: reproduction requires AI credentials for directive/suggestion flow. If credentials are unavailable, add temporary debug logging to the `onNewShader` callback and `openFullscreen` to trace the execution path, then trigger via a mock.

## Investigation checklist

- [ ] Does `edit-view.ts` call `closeEditView()` after firing `onNewShader`, or is the caller responsible?
- [ ] After `closeFullscreen()` returns, is `fullscreenOverlay` null? (should be — it's synchronous)
- [ ] Is the new fullscreen overlay appended to DOM? Is it visible or hidden behind the edit overlay?
- [ ] Does any `popstate` event fire between `closeFullscreen()` and `openFullscreen()`?

## Also note: duplicated onNewShader callback

The `onNewShader` handler is copy-pasted in at least 2 places (lines ~265 and ~354). Both have the same bug. Extract a shared helper when fixing.

## Acceptance Criteria

1. After applying a directive or selecting a suggestion, the new tile appears fullscreen
2. Edit view is properly closed before or during the transition
3. Browser back navigation works through the edit → new-tile flow
4. Hash URL reflects the new tile's ID at each step
5. No visual glitches during the transition
6. The duplicated `onNewShader` callback is extracted into a shared function
7. Tests cover the edit → fullscreen flow

