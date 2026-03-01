# React Migration — Epic wor-mqkc

This document coordinates the **React Interface Standardization** epic: replacing the vanilla TypeScript imperative DOM frontend with a React-based component architecture. The WebGL shader engine, context pool, and worker backend remain largely unchanged; the epic focuses on the view/interaction layer.

## Goals

- Preserve the same general flow: grid view → tap to expand → edit/evolve shaders
- Introduce reusable React components with standardized props/interfaces
- Enable straightforward testing with React Testing Library
- Not pixel-perfect replication — acceptable UX improvements during migration

## Child Tickets and Dependency Order

### Phase 1 — Foundation (ready to work)

| ID       | Title                                   | Status   |
|----------|-----------------------------------------|----------|
| wor-bstc | React project setup and Vite config     | closed   |
| wor-nqsn | WebGL shader engine React hook          | ready    |
| wor-uuyo | Shader state management context/hooks   | ready    |
| wor-96ig | Viewport observation hook (useVisibility) | ready  |
| wor-sriu | Toast notification component and context | ready  |

### Phase 2 — Tile and Grid

| ID       | Title                     | Depends on          |
|----------|---------------------------|---------------------|
| wor-82d1 | Tile React component      | wor-nqsn, wor-uuyo  |
| wor-n1ig | Tile grid layout component | wor-82d1          |

### Phase 3 — App Shell and API

| ID       | Title                        | Depends on           |
|----------|------------------------------|----------------------|
| wor-9s1n | App shell with React Router  | wor-n1ig, wor-sriu   |
| wor-kl15 | API integration hooks        | wor-uuyo, wor-sriu   |

### Phase 4 — Fullscreen and Flow

| ID       | Title                          | Depends on       |
|----------|--------------------------------|------------------|
| wor-bhzq | Fullscreen tile view component | wor-9s1n         |
| wor-wzar | Add tile flow component        | wor-9s1n, wor-kl15 |

### Phase 5 — Edit and Styles

| ID       | Title                      | Depends on            |
|----------|----------------------------|-----------------------|
| wor-njj7 | Edit view React component  | wor-bhzq, wor-kl15    |
| wor-iliz | Styles migration (CSS modules) | wor-njj7, wor-wzar |

### Phase 6 — Testing and Cleanup

| ID       | Title                           | Depends on                  |
|----------|---------------------------------|-----------------------------|
| wor-1rno | React Testing Library infra     | wor-njj7, wor-wzar, wor-iliz |
| wor-1nrd | Remove legacy vanilla TS UI     | wor-1rno                    |
| wor-h8wo | E2E tests for React app        | wor-1nrd                    |

## Next Recommended Work

Run `./tk ready` to see unblocked tickets. As of the last update, the highest-priority ready tickets are:

- **wor-nqsn** — WebGL shader engine React hook (useShaderEngine)
- **wor-uuyo** — Shader state management context and hooks

These unlock wor-82d1 (Tile component), which unlocks the tile grid and app shell.

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) — System overview and data flow
- [CONVENTIONS.md](../CONVENTIONS.md) — Coding standards and testing approach
- `./tk show wor-mqkc` — Epic details and child list
- `./tk dep tree wor-mqkc` — Dependency graph

---

*Last Updated: 2026-02-28*
