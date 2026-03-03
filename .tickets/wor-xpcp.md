---
id: wor-xpcp
status: open
deps: []
links: [wor-1nqe]
created: 2026-03-03T07:22:00Z
type: task
priority: 0
assignee: Cursor Agent
parent: wor-yjcs
tags: [billing, cloudflare, containers, durable-objects]
---
# Remove or scale down Cloudflare container causing GB-seconds charges

Investigation found an active Cloudflare Container in the account: name=moltbot-sandbox-sandbox, id=a035bacb-7f7c-4dc5-9aad-8495aed97323, instances=1, memory=12GiB, durable object namespace=dd386472f4a74b63948e82f5fe07708a. This resource is outside Tiles worker config and is the likely source of ~27M GB-seconds (~$70/mo).

## Acceptance Criteria

If container is not needed, delete it and any orphaned durable object namespace; otherwise scale to zero / reduce footprint. Verify in Cloudflare Billing > Usage that GB-seconds drop in next cycle and document outcome in ticket notes.

