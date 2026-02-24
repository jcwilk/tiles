---
id: til-442l
status: open
deps: [til-hxs3, til-yasw, til-joj6]
links: [til-wfke, til-yasw, til-l24d, til-joj6, til-ihbz, til-hxs3, til-a8g5, til-nahm]
created: 2026-02-24T06:57:09Z
type: task
priority: 2
assignee: John Wilkinson
---
# Implement prompt evaluation tests

Implement prompt eval infrastructure per research decision: gated live tests (env var, never in npm test); fixture recording to worker/src/__fixtures__/; staleness detection (hash prompt+inputs, fail with re-record message); single re-record command; structural GLSL validator (version, precision, uniforms, main, braces); documentation of workflow.

## Design

Uses canned pairs from seed-shaders.ts (Gradient+Plasma, Noise+Circles, Stripes+Rainbow).

## Acceptance Criteria

test:eval script works; fixtures record and validate; staleness detected; re-record trivial; workflow documented.

