---
id: til-ywv7
status: closed
deps: [til-t9ib]
links: []
created: 2026-02-24T08:49:20Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-84ob
---
# Remote status check

Check reachability of production endpoints: GitHub Pages frontend and deployed Cloudflare Worker. URLs configurable via env (e.g. VITE_API_URL for worker, VITE_BASE_URL or similar for frontend). Same pattern as local: hit /health for worker, / for frontend.

## Acceptance Criteria

./srv status remote reports OK/fail; env vars documented

