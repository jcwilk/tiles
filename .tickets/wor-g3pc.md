---
id: wor-g3pc
status: closed
deps: []
links: []
created: 2026-03-03T17:04:14Z
type: bug
priority: 0
assignee: Cursor Agent
tags: [frontend, webgl, shader]
---
# Fix shader rendering failure in app tiles

Tiles render with 'Shader failed to load' in grid/fullscreen despite app loading; investigate shader compile/runtime path and restore visible shader rendering.

## Acceptance Criteria

Grid tiles render shader output (not 'Shader failed to load') in local dev, fullscreen also renders, and relevant tests pass.

