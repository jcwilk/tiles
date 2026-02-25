---
id: til-3nik
status: closed
deps: [til-wipv]
links: []
created: 2026-02-25T02:12:38Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Suggestion logic module

Create frontend/src/suggest.ts that fires 3 parallel calls to POST /suggest, each with a different adventurousness tier (conservative, moderate, wild). Exposes a callback-based API so the edit view can render each suggestion card independently as it resolves. Interface: fetchSuggestions(fragmentSource: string, onSuggestion: (tier: string, suggestion: string) => void): Promise<void>. Each call resolves independently; onSuggestion fires as each one completes. Conservative suggestions tend to arrive first (simpler output).

## Acceptance Criteria

Three parallel requests fired with different adventurousness values. Each suggestion delivered via callback as it resolves. All three suggestions eventually delivered on success. Errors handled gracefully (toast or skip failed suggestion).

