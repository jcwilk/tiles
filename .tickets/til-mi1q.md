---
id: til-mi1q
status: closed
deps: [til-v29p, til-vnqn]
links: []
created: 2026-02-24T08:02:32Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-4lmn
---
# Add scheduled handler for threshold-based email alerts

Add scheduled() export to worker. Read config:alerts from KV (email, threshold %, per-tier on/off). Check usage vs limits; if >= threshold, send email via ALERT_EMAIL binding. Dedupe via alert:sent:* keys.

## Acceptance Criteria

Cron fires every 15min; sends email when threshold exceeded; respects per-tier config; deduplicates

