---
id: til-v29p
status: closed
deps: []
links: []
created: 2026-02-24T08:02:29Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-4lmn
---
# Add KV-based dynamic limit overrides

Add config:limits KV key with JSON { ipPerHour?, globalPerHour?, globalPerDay? }. Worker reads at request time; values override env vars. Add getLimits(env) with fallback: KV -> env -> default.

## Acceptance Criteria

Worker uses KV overrides when present; ./rl limits set can write to config:limits

