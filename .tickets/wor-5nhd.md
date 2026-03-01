---
id: wor-5nhd
status: open
deps: []
links: []
created: 2026-03-01T03:17:59Z
type: chore
priority: 3
assignee: Cursor Agent
parent: wor-yjcs
tags: [worker, cleanup]
---
# Remove or connect dead /generate (merge) endpoint

The /generate POST endpoint (handleGenerate) in worker/src/index.ts handles shader merging (drag tile A onto tile B) but is never called by the frontend. The frontend uses /generate-from-prompt, /suggest, and /apply-directive exclusively. The architecture doc describes drag-to-merge as a core feature but it appears to have been superseded by the directive/suggestion flow. Either remove the dead endpoint to reduce code surface and maintenance burden, or connect it to the frontend if merge-by-drag is still desired.

## Acceptance Criteria

Either: (A) /generate endpoint and buildMergePrompt removed from worker, prompt-eval tests updated, or (B) /generate endpoint connected to frontend drag-drop interaction. Decision documented.

