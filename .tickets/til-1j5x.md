---
id: til-1j5x
status: open
deps: []
links: [til-g3qa]
created: 2026-02-26T00:26:01Z
type: bug
priority: 2
assignee: John Wilkinson
---
# Fix: tile delete button click triggers fullscreen instead of deleting

When clicking the delete button (×) on a tile in grid view, the tile opens fullscreen instead of being deleted.

## Existing guards (already in code)

The codebase already has two layers of defense — both should prevent this bug:

1. **`main.ts`** (6 instances): `if ((e.target as HTMLElement).closest?.('.tile-delete')) return;` before `openFullscreen()`
2. **`tile.ts`** (2 instances): `e.stopPropagation()` on the delete button's click handler

If both guards are present and correct, this bug should not occur. The first step is to reproduce and confirm.

## Reproduction required (step 1)

Before writing any fix, reproduce the bug:

1. Run `npm run dev`, open `http://localhost:5173`
2. Ensure at least one tile with a delete button is visible in the grid
3. Open DevTools → Elements, inspect the `×` button, confirm it has class `tile-delete` and is a direct child of `.tile`
4. Open DevTools → Console, add a breakpoint or `console.log` in both the tile click handler and the delete button handler
5. Click the `×` button — observe which handler(s) fire and in what order
6. If the bug does NOT reproduce: close this ticket. If it does: record browser, OS, and whether it's mouse or touch

## Likely root causes (if reproducible)

- CSS `pointer-events: none` on `.tile-delete` or an ancestor
- An overlay element (z-index) sitting on top of the delete button, stealing the click
- `e.target` being a text node inside the button (`.closest` works on text nodes via parentElement, so this is unlikely — but verify)
- The tile click handler registered with `{ capture: true }` (it isn't currently, but check)

## Fix approach (only after reproduction)

1. Confirm the element structure: `×` button is reachable and clickable
2. Add `pointer-events: all` to `.tile-delete` in CSS as a safety net
3. Broaden the guard in `main.ts` to check `.closest('.tile-delete, .tile-controls')` for future-proofing
4. Add `preventDefault()` alongside `stopPropagation()` in the button handler

## Acceptance Criteria

1. Bug is reproduced (or ticket is closed as not-reproducible)
2. If reproduced: clicking delete deletes the tile, not fullscreens it
3. Clicking tile body (outside buttons) still opens fullscreen
4. Tests cover button click vs tile click behavior
5. No regression in fullscreen opening

