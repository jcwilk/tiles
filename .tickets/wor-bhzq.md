---
id: wor-bhzq
status: closed
deps: [wor-9s1n]
links: []
created: 2026-02-27T02:33:16Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# Fullscreen tile view component

Create a FullscreenView React component that displays a single shader tile in fullscreen. Props: FullscreenViewProps { shaderId: string }. The component should: (1) Look up the shader from context via useShaders(). (2) Render a full-viewport Tile component with priority='fullscreen'. (3) Provide a close button (X) that navigates back to grid. (4) Provide an edit button that navigates to /tile/:id/edit. (5) Show delete button for non-builtin shaders. (6) Handle the case where shaderId doesn't match any shader (redirect to grid). Render as an overlay or full-page view depending on routing approach. Pause/deprioritize grid tiles while fullscreen is active (via context pool priority).

## Acceptance Criteria

FullscreenView renders a full-viewport shader. Close navigates back to grid. Edit navigates to edit view. Delete removes shader and returns to grid. Non-existent shader redirects to grid. Grid tiles deprioritized while fullscreen. Unit tests verify rendering and navigation.

