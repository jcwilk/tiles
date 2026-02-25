---
id: til-bvno
status: open
deps: []
links: []
created: 2026-02-25T02:12:08Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Worker: POST /apply-directive endpoint

Add a POST /apply-directive endpoint to worker/src/index.ts that takes { fragmentSource: string, directive: string, contextShaders?: string[] } and returns { fragmentSource: string } with modified GLSL. System prompt clearly distinguishes: main shader is being edited, context shaders are REFERENCE ONLY. Rate-limited via existing infrastructure.

## Design

System prompt: expert GLSL programmer modifying a shader per directive. User prompt: MAIN SHADER (the one to edit) in a labeled block, then DIRECTIVE text, then optional REFERENCE SHADERS (each in labeled blocks, clearly marked as context only — do not copy wholesale, use for inspiration). Output raw GLSL only. Uses sanitizeGLSL on response. Same max_tokens as existing merge endpoint.

## Acceptance Criteria

POST /apply-directive returns modified GLSL. Context shaders are passed through to the prompt when provided. Rate-limited. Invalid requests return 400. CORS enforced.

