---
id: wor-mqkc
status: in_progress
deps: [wor-yc6s]
links: []
created: 2026-02-27T02:31:11Z
type: epic
priority: 1
assignee: Cursor Agent
---
# Epic: React Interface Standardization

Replace the entire vanilla TypeScript imperative DOM frontend with a React-based component architecture. The goal is not pixel-perfect replication of the current UI, but preserving the same general flow and operation options (grid view → tap to expand → edit/evolve shaders) while introducing reusable React components with standardized props/interfaces that are straightforward to test with React Testing Library. Key areas: React project setup, app shell with declarative routing, shader state management via context/hooks, tile rendering components with WebGL integration, fullscreen and edit views as composable components, toast system, API hooks, and a full test migration. The WebGL shader engine, context pool, and worker backend remain largely unchanged — this epic focuses on the view/interaction layer.

## Coordination

See [docs/React-migration.md](../docs/React-migration.md) for execution order, dependency phases, and next recommended tickets.

