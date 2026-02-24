---
id: til-t9ib
status: open
deps: []
links: []
created: 2026-02-24T08:49:25Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-84ob
---
# CLI scaffold and status local

Create ./srv script (symlink to scripts/srv) with help and subcommand structure. Implement 'status' (or 'status local') to check frontend and worker reachability. Follow ./rl pattern for structure. Configurable URLs via env.

## Acceptance Criteria

./srv help works; ./srv status reports local endpoints

