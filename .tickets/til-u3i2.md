---
id: til-u3i2
status: open
deps: []
links: []
created: 2026-02-25T02:12:27Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Edit view styles

Add CSS to frontend/src/styles.css for the edit view interface. Mobile-first, scrollable. Classes: .edit-view (fullscreen scrollable container, z-index 1000), .edit-view-shader (large shader preview area), .edit-suggestion (card with shimmer loading state, text content, clickable button state), .edit-actions (pencil + mic button row, compact, centered), .edit-directive-input (text input, hidden by default, slides in on pencil click), .edit-context-grid (small tile thumbnails with checkbox overlays), .edit-mic-active (recording pulse animation, reuse pattern from .tile-add-recording).

## Acceptance Criteria

All edit view CSS classes defined. Edit view is fullscreen and scrollable. Suggestion cards have shimmer loading animation. Text input is hidden by default. Mic active state has pulse animation. Mobile-first responsive layout.

