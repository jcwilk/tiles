---
id: til-zwwo
status: closed
deps: [til-bnxx]
links: []
created: 2026-02-24T02:14:07Z
type: task
priority: 2
assignee: John Wilkinson
---
# Build Cloudflare Worker AI Proxy

Create an API endpoint to receive two shader sources and prompt the LLM. Enforce CORS policies allowing only GitHub Pages origin. Implement 3-tier token rate limiting (IP/hour, global/hour, global/day) using Cloudflare KV.

