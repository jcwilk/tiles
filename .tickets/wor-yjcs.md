---
id: wor-yjcs
status: closed
deps: []
links: []
created: 2026-03-01T03:16:51Z
type: epic
priority: 2
assignee: Cursor Agent
---
# Epic: Investigate & Reduce Cloudflare Worker Costs (GB-seconds billing)

Investigate the source of ~27M GB-seconds / $70/month Cloudflare billing. Standard Workers haven't billed in GB-seconds since March 2024 — the charge likely originates from Containers, Durable Objects, or another product on the same account. Additionally, address frontend and worker inefficiencies that waste API calls and worker execution time: missing AbortControllers, unnecessary cron invocations, missing AI call timeouts, and eager suggestion fetching.

