---
id: wor-fzu3
status: open
deps: []
links: []
created: 2026-02-26T19:45:21Z
type: feature
priority: 1
assignee: John Wilkinson
parent: til-lcau
---
# Shared offscreen validation context for shader compilation

`merge.ts` and `apply-directive.ts` each create throwaway 1×1 canvases to compile-check generated GLSL before saving. Every call allocates a new WebGL2 context that counts against the browser limit and is never reused.

## Current behavior

- `merge.ts` calls `createShaderEngine(tempCanvas)` inside its retry loop
- `apply-directive.ts` does the same
- Each temp canvas/context is created, used once, and (sometimes) disposed — but disposal timing is unreliable and the context may linger

## Change

Create a single shared offscreen validation context (`frontend/src/validation-context.ts` or similar):

1. Lazily create one 1×1 offscreen canvas + WebGL2 context on first use
2. Export a `compileCheck(fragmentSource: string): boolean` (or `{ ok, errors }`) function that compiles a vertex+fragment program on the shared context, checks link status, and cleans up the program/shaders — without disposing the context itself
3. Replace the temp-canvas pattern in `merge.ts` and `apply-directive.ts` with calls to the shared helper
4. Add a `disposeValidationContext()` for teardown in tests

## Acceptance Criteria

1. Only one WebGL2 context is ever created for validation purposes, regardless of how many merges/directives are applied
2. `merge.ts` and `apply-directive.ts` no longer create their own temp canvases
3. Validation helper correctly reports compile/link success and failure
4. Existing tests for merge and apply-directive still pass
5. New unit tests cover the shared validation helper (success, failure, re-use)
6. Lint passes

