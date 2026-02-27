---
id: wor-uuyo
status: open
deps: [wor-bstc]
links: []
created: 2026-02-27T02:31:38Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# Shader state management context and hooks

Create a ShaderContext (React context) and ShaderProvider component that wraps the existing IndexedDB storage layer. Provide hooks: useShaders() returns the list of ShaderObjects and loading state; useAddShader() adds a shader and updates state; useDeleteShader() deletes a shader and updates state. The provider initializes storage, runs seeding logic, and exposes the shader list reactively. Keep the existing storage.ts and seed.ts modules as the underlying implementation — this layer wraps them in React-friendly state. Include an in-memory storage option for tests (already exists in storage.ts). Export clean TypeScript interfaces for all hook return types.

## Acceptance Criteria

ShaderProvider renders children and initializes storage. useShaders() returns shader list that updates when shaders are added/deleted. useAddShader() persists to IndexedDB and updates context. useDeleteShader() persists and updates context. Built-in shaders cannot be deleted (enforced). Unit tests pass using in-memory storage.

