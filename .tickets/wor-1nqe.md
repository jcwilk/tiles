---
id: wor-1nqe
status: closed
deps: []
links: [wor-xpcp]
created: 2026-03-01T03:17:02Z
type: task
priority: 0
assignee: Cursor Agent
parent: wor-yjcs
tags: [billing, investigation]
---
# Investigate GB-seconds billing source on Cloudflare dashboard

The ~27M GB-seconds ($70/month) charge is almost certainly NOT from the Tiles Worker itself. Standard Cloudflare Workers moved to CPU-time billing in March 2024 and no longer bill in GB-seconds. GB-seconds is the billing unit for Cloudflare Containers ($0.0000025/GiB-s, 27M × that = $67.50 — matches almost exactly) or Durable Objects ($12.50/M GB-s). Check the Cloudflare dashboard: Billing > Usage to identify which product generates the charge. Look for accidentally deployed Containers, Durable Object namespaces, or other resources on the same account. Run 'npx wrangler d1 list', 'npx wrangler queues list' and check for additional wrangler.toml files or deployed workers.

## Acceptance Criteria

Root cause of GB-seconds billing identified. If it's an unneeded resource, it is deleted or a follow-up ticket is created to remove it.

## Notes

**2026-03-03T07:23:29Z**

Summary: Active Cloudflare container `moltbot-sandbox-sandbox` (`a035bacb-7f7c-4dc5-9aad-8495aed97323`) with one active instance, 12 GiB memory, and linked durable object namespace `dd386472f4a74b63948e82f5fe07708a` is the likely GB-seconds source. `wrangler queues list` returned empty; `wrangler d1 list` was blocked by API token scope (`10000`). Follow-up ticket `wor-xpcp` created for remediation.
