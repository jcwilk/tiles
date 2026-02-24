---
id: til-nahm
status: closed
deps: [til-yasw]
links: [til-wfke, til-yasw, til-l24d, til-joj6, til-442l, til-ihbz, til-hxs3, til-a8g5]
created: 2026-02-24T06:57:07Z
type: task
priority: 2
assignee: John Wilkinson
---
# Unit tests for sanitizeGLSL

Add unit tests in worker/src/index.test.ts for sanitizeGLSL: input with markdown fences -> clean GLSL; missing #version -> prepended; missing precision -> inserted; clean input -> unchanged; prose before/after -> stripped.

## Acceptance Criteria

All sanitization edge cases covered; tests pass.

