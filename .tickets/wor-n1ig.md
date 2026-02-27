---
id: wor-n1ig
status: open
deps: [wor-82d1]
links: []
created: 2026-02-27T02:32:50Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# Tile grid layout component

Create a TileGrid React component that renders the responsive grid of shader tiles. Props: TileGridProps { shaders: ShaderObject[], onTileClick: (id: string) => void, onTileDelete: (id: string) => void, onAddTile: () => void }. The component should: (1) Map shaders to Tile components in a CSS grid. (2) Maintain the existing responsive layout (1→2→3→4 columns based on viewport width). (3) Include an AddTileButton component at the end of the grid. (4) Handle viewport observation — tiles entering/leaving the viewport get priority updates automatically. (5) Newest tiles appear first (existing sort order). Use CSS modules or styled approach consistent with the project. The grid should be the default view when no tile is expanded.

## Acceptance Criteria

TileGrid renders a responsive grid of Tile components. Grid responds to viewport width changes (1-4 columns). AddTileButton renders at end of grid. Tile click and delete callbacks propagate correctly. Unit tests render TileGrid with mock shaders and verify grid structure.

