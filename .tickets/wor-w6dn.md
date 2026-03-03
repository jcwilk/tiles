---
id: wor-w6dn
status: closed
deps: [wor-1nqe]
links: []
created: 2026-03-01T03:17:12Z
type: chore
priority: 2
assignee: Cursor Agent
parent: wor-yjcs
tags: [worker, optimization]
---
# Disable or conditionally enable cron trigger in worker

The wrangler.toml cron trigger (*/15 * * * *) fires every 15 minutes (2,880 invocations/month) but the handleScheduled handler returns immediately because ALERT_EMAIL is commented out. While nearly free under CPU-time billing, each invocation still counts as a request and wastes resources. Either remove the cron trigger entirely until ALERT_EMAIL is actually configured, or gate the cron behind an env var check at the wrangler.toml level.

## Design

Option A: Remove [triggers] crons from wrangler.toml entirely (re-add when email alerting is needed). Option B: Keep the cron but document that it's a no-op without ALERT_EMAIL. Option A is preferred since it eliminates 2,880 wasted invocations/month.

## Acceptance Criteria

Cron trigger no longer fires when ALERT_EMAIL is not configured. No unnecessary scheduled invocations. Tests pass.

