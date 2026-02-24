---
id: til-i88y
status: closed
deps: [til-uoxd, til-v29p, til-mi1q]
links: []
created: 2026-02-24T08:02:32Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-4lmn
---
# Add tests for usage endpoint, getLimits, and scheduled handler

Add Vitest tests: GET /usage returns correct shape; getLimits() respects KV overrides; scheduled handler fires alert when threshold exceeded, respects per-tier config, deduplicates. Mock send_email binding.

## Acceptance Criteria

npm test passes; coverage for new code paths

