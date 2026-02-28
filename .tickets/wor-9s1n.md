---
id: wor-9s1n
status: closed
deps: [wor-n1ig, wor-sriu]
links: []
created: 2026-02-27T02:33:03Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# App shell with React Router navigation

Create the top-level App component with React Router (or a lightweight routing solution) that manages navigation between views. Routes: (1) / — TileGrid view (default). (2) /tile/:id — Fullscreen view of a single tile. (3) /tile/:id/edit — Edit view for a tile. Navigation should use the browser History API so the back button works naturally (matching current behavior where fullscreen pushes history state). The App component wraps everything in ShaderProvider and ToastProvider. Create a minimal layout shell that the views render into. Ensure deep-linking works (navigating directly to /tile/:id opens that tile fullscreen).

## Acceptance Criteria

App renders TileGrid at root route. Navigating to /tile/:id shows fullscreen view. Navigating to /tile/:id/edit shows edit view. Browser back button navigates correctly. Deep links work. ShaderProvider and ToastProvider wrap all routes. Unit tests verify route rendering.

