---
id: til-2bxh
status: closed
deps: []
links: []
created: 2026-02-25T20:21:37Z
type: bug
priority: 1
assignee: John Wilkinson
tags: [worker, ai, debug]
---
# AI endpoints hang

All AI-related endpoints appear to hang (no response). Reproduce locally and/or against Cloudflare, add instrumentation, identify root cause, and fix without introducing timeout-based behavior.

## Acceptance Criteria

Reproduction no longer hangs; endpoints return expected error/success; verified with runtime logs; tests/lint pass; changes committed+pushed.

