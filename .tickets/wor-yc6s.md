---
id: wor-yc6s
status: open
deps: []
links: []
created: 2026-02-27T02:30:57Z
type: feature
priority: 1
assignee: Cursor Agent
---
# Remove drag-to-merge behavior

Remove the drag-and-drop tile merge interaction entirely. This includes: (1) Delete drag-drop.ts and merge-connection-animation.ts modules. (2) Remove all drag-drop setup/teardown calls in main.ts (setupTileDragDrop, teardownDragDrop, makeMergeHandler). (3) Remove merge.ts orchestration module. (4) Remove the POST /merge endpoint usage from api.ts (keep the endpoint in the worker for now). (5) Remove drag-related CSS classes (.tile-dragging, .tile-drop-target, drag animations) from styles.css. (6) Remove or update any tests that exercise drag-to-merge flows. (7) Clean up click-utils.ts if drag suppression logic is no longer needed. The edit view (apply-directive with AI suggestions) remains the sole way to evolve shaders.

## Acceptance Criteria

drag-drop.ts and merge-connection-animation.ts are deleted. merge.ts is deleted. No drag event listeners are attached to tiles. All drag-related CSS is removed. Existing tests pass (minus removed drag/merge tests). Lint passes. The edit view still works for shader evolution.

