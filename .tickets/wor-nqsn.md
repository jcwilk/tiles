---
id: wor-nqsn
status: open
deps: [wor-bstc]
links: []
created: 2026-02-27T02:32:07Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# WebGL shader engine React hook (useShaderEngine)

Create a useShaderEngine(canvasRef, shaderObject, options?) custom hook that encapsulates the WebGL shader engine lifecycle. The hook should: (1) Create/destroy the ShaderEngine when the canvas or shader changes. (2) Manage the requestAnimationFrame render loop (start on mount, cancel on unmount). (3) Integrate with the WebGL context pool for context acquisition and priority management. (4) Handle context loss gracefully — capture snapshots, show placeholder, allow recovery. (5) Forward pointer/touch events to the engine for u_touch uniform updates. (6) Accept a priority option (fullscreen vs visible vs offscreen) for context pool integration. Keep shader-engine.ts, webgl-context-pool.ts, and validation-context.ts as-is — this hook wraps them for React. Export a clean interface: UseShaderEngineResult { engine, isLoading, hasContextLoss, recover }.

## Acceptance Criteria

useShaderEngine renders a shader on a canvas ref. Animation loop starts/stops with component lifecycle. Context loss triggers placeholder display and recovery callback. Priority changes update context pool. Unit tests verify lifecycle with mocked WebGL.

