---
id: til-1j5x
status: open
deps: []
links: []
created: 2026-02-26T00:26:01Z
type: bug
priority: 1
assignee: John Wilkinson
parent: til-n5ip
---
# Fix: tile delete button click triggers fullscreen instead of deleting

When clicking the delete button (×) on a tile in the grid view, instead of deleting the tile, it opens the tile in fullscreen. The fullscreen click handler on the tile element is taking precedence over the delete button's click handler.

## Current implementation:

### Click handler (main.ts ~line 99-101):
```typescript
tile.element.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest?.('.tile-delete')) return;
  openFullscreen(newTile);
});
```

### Delete button (tile.ts ~line 42-52):
- Button with class `.tile-delete`
- Has its own click handler that calls `onDelete` callback
- Calls `e.stopPropagation()` to prevent bubbling

## Likely root cause:
The `closest('.tile-delete')` check in the tile click handler or the `stopPropagation()` in the delete button handler isn't working correctly. Possible issues:
- The `e.target` might not be the button itself if the × text node is clicked
- CSS `pointer-events` might be interfering
- The delete button might be covered by another element (z-index issue)
- The tile's click handler might be using event capture phase instead of bubble phase
- The `.closest()` check might fail due to shadow DOM or element structure

## General principle to enforce:
**Any interactive buttons/controls on a tile (delete, edit, etc.) must ALWAYS take precedence over the tile's click-to-fullscreen behavior.** This should be robust — use stopPropagation AND check in the parent handler, and ensure z-index/pointer-events are correct.

## Fix approach:
1. Verify the delete button element structure and that `.closest('.tile-delete')` works
2. Ensure `stopPropagation()` and `preventDefault()` are called on button click
3. Consider using `pointer-events: all` on buttons and checking `e.target` more carefully
4. Add a general guard: any click on a `.tile-delete`, `.tile-edit`, or similar control class should never propagate to the fullscreen handler
5. Ensure the delete button has sufficient z-index and is not covered by overlay elements

## Verification:
- Click delete (×) on a tile in grid view → tile is deleted, NOT fullscreened
- Click on the tile itself (not on any button) → tile opens fullscreen
- Test on both desktop and mobile (touch events)
- Rapid clicking should not cause race conditions

## Acceptance Criteria

1. Clicking delete button on a tile in grid view deletes the tile (not fullscreens it)
2. Clicking on the tile body (outside buttons) still opens fullscreen
3. All tile overlay buttons (delete, future controls) take precedence over tile click
4. Works on desktop and mobile
5. Tests cover button click vs tile click behavior
6. No regression in fullscreen opening

