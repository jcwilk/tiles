---
id: wor-82d1
status: open
deps: [wor-nqsn, wor-uuyo]
links: []
created: 2026-02-27T02:32:36Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# Tile React component

Create a reusable Tile React component that renders a single shader tile. Props interface: TileProps { shader: ShaderObject, priority?: 'fullscreen' | 'visible' | 'offscreen', onClick?: () => void, onDelete?: () => void, isBuiltin?: boolean, className?: string }. The component should: (1) Render a canvas element and use useShaderEngine to drive WebGL rendering. (2) Show a context-loss placeholder with snapshot image when the context is lost. (3) Display a delete button (unless isBuiltin). (4) Handle click events for expansion. (5) Accept priority prop to control context pool priority. (6) Use React.memo to avoid unnecessary re-renders. (7) Use useIntersectionObserver (or a simple visibility hook) to auto-set priority when in grid mode. The component should have a clean, testable interface — render with a ShaderObject and get predictable DOM output.

## Acceptance Criteria

Tile component renders a canvas with running shader. Delete button appears for non-builtin tiles. Click handler fires on tap. Context loss shows placeholder with recovery. Priority prop controls WebGL context pool. Component is memoized. Unit tests render Tile with mock shader and verify DOM structure.

