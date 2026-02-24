---
id: til-vnqn
status: open
deps: []
links: []
created: 2026-02-24T08:02:30Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-4lmn
---
# Add wrangler cron trigger and send_email binding

Update worker/wrangler.toml: add [triggers] crons = ['*/15 * * * *'], add [[send_email]] name = ALERT_EMAIL. Add mimetext dependency to worker/package.json.

## Acceptance Criteria

wrangler.toml has cron and send_email; mimetext in package.json

