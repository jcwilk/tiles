---
id: wor-x467
status: open
deps: [wor-1nqe]
links: []
created: 2026-03-01T03:17:39Z
type: feature
priority: 1
assignee: Cursor Agent
parent: wor-yjcs
tags: [worker, reliability]
---
# Add timeouts to Worker AI calls to prevent indefinite hangs

The env.AI.run() calls in handleGenerate, handleGenerateFromPrompt, handleSuggest, and handleApplyDirective have no timeout. If the Cloudflare Workers AI backend hangs or is slow, the worker sits waiting indefinitely (AI calls are I/O wait, not CPU time, so they bypass the 30s CPU limit). While Cloudflare has its own hard limits, there is no application-level timeout to fail fast and free resources. Add AbortController-based timeouts (e.g., 30 seconds) to all env.AI.run() calls. Return a 504 Gateway Timeout to the client when the AI call times out.

## Design

Create an AbortController, set up a setTimeout to call abort(), pass the signal to env.AI.run() if supported, or use Promise.race with a timeout promise. Clean up the timeout on success/failure. Consider making the timeout configurable via env var (AI_TIMEOUT_MS).

## Acceptance Criteria

All env.AI.run() calls have a configurable timeout (default 30s). Timed-out calls return 504 with a descriptive error message. Unit tests cover the timeout path. Existing tests pass.

