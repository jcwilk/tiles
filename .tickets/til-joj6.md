---
id: til-joj6
status: open
deps: [til-ihbz]
links: [til-wfke, til-yasw, til-l24d, til-442l, til-ihbz, til-hxs3, til-a8g5, til-nahm]
created: 2026-02-24T06:57:06Z
type: task
priority: 2
assignee: John Wilkinson
---
# Improve AI merge prompt

Tighten system prompt and buildMergePrompt() in worker/src/index.ts. Be explicit about output format: raw GLSL only, no markdown, required directives, output template. Require #version 300 es and precision highp float.

## Acceptance Criteria

Prompt constrains output format; model instructed on required GLSL structure.

