---
id: til-inbx
status: closed
deps: []
links: []
created: 2026-02-24T08:49:20Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-84ob
---
# Local status check

Check reachability of local dev servers: frontend (Vite, default 5173) and worker (Wrangler, default 8787). Output reachable/unreachable per endpoint. Support configurable URLs via env (e.g. VITE_DEV_URL, WORKER_DEV_URL). Use curl or equivalent to hit / for frontend and /health for worker.

## Acceptance Criteria

./srv status (or ./srv status local) reports OK/fail for each; exit 0 only if all reachable

