---
id: til-xoom
status: closed
deps: []
links: []
created: 2026-02-24T10:24:58Z
type: bug
priority: 1
assignee: John Wilkinson
parent: til-6h6m
---
# Fix: delete button click propagates to tile fullscreen handler

When clicking the × (delete) button on a tile, the click event bubbles up and triggers the tile's click handler which opens fullscreen. The e.stopPropagation() in tile.ts should prevent this, but the fullscreen click listener on tile.element in main.ts still fires. The tile should just be removed immediately on delete — no fullscreen.

## Design

Investigate why stopPropagation on the delete button click isn't preventing the tile-level click handler from firing. Likely causes: (1) the event listener on tile.element is catching the event at the same DOM level before propagation is stopped, or (2) pointer events from drag-drop are interfering. Fix by either checking e.target in the fullscreen click handler, or restructuring event flow so the delete button click never reaches the fullscreen handler.

## Acceptance Criteria

1. Clicking the × button removes the tile immediately without opening fullscreen. 2. Clicking elsewhere on the tile still opens fullscreen as before. 3. Drag-and-drop behavior is unaffected.

