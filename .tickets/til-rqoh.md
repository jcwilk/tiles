---
id: til-rqoh
status: open
deps: [til-wipv]
links: []
created: 2026-02-25T02:12:46Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Apply directive logic module

Create frontend/src/apply-directive.ts that calls POST /apply-directive with the main shader code, directive text, and optional context shader codes. Handles the compile-retry loop (same 3-attempt pattern as merge.ts): compile returned GLSL locally, if it fails pass the error back as previousError for retry. On success, create a new ShaderObject, save to IndexedDB via storage.add(), return it. Interface: performApplyDirective(shader: ShaderObject, directive: string, storage: ShaderStorage, contextShaders?: ShaderObject[]): Promise<{ success: boolean; shader?: ShaderObject }>.

## Design

Follow the exact pattern from merge.ts performMerge: loop up to 3 attempts, call applyDirective API, stripMarkdownFences, createTempCanvas + createShaderEngine to validate, capture compile errors for retry. New shader gets crypto.randomUUID() id, name derived from directive text.

## Acceptance Criteria

Directive applied successfully returns new ShaderObject. Compile failures trigger retry with error context (up to 3 attempts). Shader saved to IndexedDB on success. Toast shown on final failure.

