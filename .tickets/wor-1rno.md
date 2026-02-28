---
id: wor-1rno
status: closed
deps: [wor-njj7, wor-wzar, wor-iliz]
links: []
created: 2026-02-27T02:34:26Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# React Testing Library test infrastructure

Set up React Testing Library infrastructure and migrate existing frontend tests. (1) Configure Vitest with React Testing Library (@testing-library/react, @testing-library/jest-dom, @testing-library/user-event). (2) Create test utilities: renderWithProviders() wrapper that includes ShaderProvider (in-memory storage) and ToastProvider, and a MemoryRouter for route testing. (3) Create mock factories: createMockShader() for generating test ShaderObjects. (4) Migrate or rewrite tests for each React component: Tile, TileGrid, FullscreenView, EditView, AddTileDialog, Toast. (5) Test hooks independently using renderHook: useShaders, useShaderEngine (with mocked WebGL), useGenerateFromPrompt, useFetchSuggestions, useApplyDirective, useVisibility. (6) Preserve the existing placeholder validation pattern ([VALID CODE]/[INVALID CODE]) for shader compilation tests per CONVENTIONS.md. (7) Keep test-harness.ts mock fetch patterns for API tests.

## Acceptance Criteria

React Testing Library is configured with Vitest. renderWithProviders utility wraps all necessary providers. Component tests render and assert on DOM structure. Hook tests verify state transitions. API hook tests use mock fetch harness. Placeholder shader pattern works in React context. All tests pass. Coverage is comparable to or better than pre-migration.

