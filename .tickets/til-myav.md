---
id: til-myav
status: closed
deps: [til-a78e]
links: []
created: 2026-02-24T19:54:05Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-wmtr
---
# Rewrite srv tool in TypeScript

Port all existing features from scripts/srv (188 lines of bash) to scripts/srv.ts. Features to port: status local/remote (HTTP reachability checks), start (spawn npm run dev, write PID file), stop (read PID file, kill process tree), restart (stop then start), help text. Key considerations: process management via Node child_process APIs; the pkill -P pattern for killing process trees needs care (consider tree-kill or process.kill(-pid) with process groups); environment variable handling stays the same. Deliverables: new scripts/srv.ts, delete scripts/srv (bash), update ./srv symlink. When verifying start/stop, be careful not to leave orphaned processes.

