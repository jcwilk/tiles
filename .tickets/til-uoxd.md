---
id: til-uoxd
status: open
deps: []
links: []
created: 2026-02-24T08:02:29Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-4lmn
---
# Add GET /usage endpoint to worker

Add a GET /usage endpoint to worker/src/index.ts that reads current KV counters (global:hour, global:day) and returns JSON with hour/day usage and limits. Unauthenticated, read-only.

## Acceptance Criteria

GET /usage returns { hour: { key, globalTokens, limit }, day: { key, globalTokens, limit }, limits: { ipPerHour, globalPerHour, globalPerDay } }

