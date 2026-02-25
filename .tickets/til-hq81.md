---
id: til-hq81
status: open
deps: [til-q6gh, til-n4wb]
links: []
created: 2026-02-25T02:13:08Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Fullscreen edit button and navigation wiring

Add an Edit button to the fullscreen view in openFullscreen() in main.ts, positioned near the close button. Clicking it opens the edit view (from edit-view.ts) for the current shader. Wire up navigation: pushState #id/edit, extend handlePopState to detect edit view transitions. On page load, if hash matches #id/edit, open the edit view directly. Connect edit view's onNewShader callback to prepend the new tile to the grid, update the tiles array, and re-setup drag-drop.

## Design

In openFullscreen(): create an Edit button (pencil icon or 'Edit' text), append to overlay. On click: call openEditView(shader, tiles.map(t => t.shader), storage, { onNewShader }). In handlePopState: if fullscreenOverlay exists and no edit hash, close edit view if open. In init(): after existing hash check, also check for /edit suffix.

## Acceptance Criteria

Edit button visible in fullscreen view. Clicking it opens the edit interface. Back from edit returns to fullscreen. New shaders from edit appear at start of grid. Page load with #id/edit hash opens edit view directly.

