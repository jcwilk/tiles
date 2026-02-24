---
id: til-yasw
status: open
deps: [til-ihbz]
links: [til-wfke, til-l24d, til-joj6, til-442l, til-ihbz, til-hxs3, til-a8g5, til-nahm]
created: 2026-02-24T06:57:05Z
type: task
priority: 2
assignee: John Wilkinson
---
# Add GLSL response sanitization

Add sanitizeGLSL() in worker/src/index.ts: strip markdown fences, extract GLSL code block, ensure #version 300 es and precision qualifier. Apply before returning fragmentSource. Add defensive markdown-fence strip in frontend/src/merge.ts.

## Design

See plan Phase 2 - Response sanitization.

## Acceptance Criteria

Worker and client sanitize AI output; markdown and prose stripped; required boilerplate ensured.

