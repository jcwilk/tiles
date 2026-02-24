---
id: til-jvep
status: closed
deps: [til-t9ib]
links: []
created: 2026-02-24T08:49:21Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-84ob
---
# Management: start, stop, restart

Subcommands: start (run npm run dev in background), stop (kill dev processes), restart (stop then start). Reuse existing npm run dev; optionally integrate with status to report what was started. Consider process tracking (pidfile or similar) for reliable stop.

## Acceptance Criteria

./srv start brings up frontend+worker; ./srv stop terminates them; ./srv restart works

