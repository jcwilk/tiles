---
id: til-wipv
status: open
deps: [til-cled, til-bvno]
links: []
created: 2026-02-25T02:12:14Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# API client: fetchSuggestion and applyDirective

Add two new functions to frontend/src/api.ts: (1) fetchSuggestion(fragmentSource: string, adventurousness: string): Promise<{ suggestion: string }> — calls POST /suggest. (2) applyDirective(fragmentSource: string, directive: string, contextShaders?: string[]): Promise<GenerateResponse> — calls POST /apply-directive. Follow existing patterns (error handling, getApiUrl(), typed responses).

## Acceptance Criteria

Both functions exported from api.ts. fetchSuggestion calls /suggest and returns typed response. applyDirective calls /apply-directive and returns GenerateResponse. Error handling matches existing patterns (throw on non-ok, parse error details).

