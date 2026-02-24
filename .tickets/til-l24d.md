---
id: til-l24d
status: closed
deps: [til-yasw, til-joj6, til-nahm, til-442l]
links: [til-wfke, til-yasw, til-joj6, til-442l, til-ihbz, til-hxs3, til-a8g5, til-nahm]
created: 2026-02-24T06:57:09Z
type: task
priority: 2
assignee: John Wilkinson
---
# End-to-end verification of shader merge fix

Verify the full fix: trigger merge via browser automation, confirm shader compiles and new tile appears; npm test passes; npm run test:eval passes against live worker. Contingency: if AI still generates bad GLSL, consider constrained prompt template or different model.

## Acceptance Criteria

Browser merge succeeds; all tests pass; prompt eval passes.

