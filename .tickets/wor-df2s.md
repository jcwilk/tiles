---
id: wor-df2s
status: closed
deps: [wor-qgow]
links: []
created: 2026-03-01T03:17:50Z
type: feature
priority: 2
assignee: Cursor Agent
parent: wor-yjcs
tags: [frontend, optimization]
---
# Lazy-load or debounce AI suggestions in EditView

Every time a user opens EditView (/tile/:id/edit), 3 parallel /suggest requests fire immediately via useEffect. If the user is just browsing or quickly navigating between tiles, these requests are wasted. Options: (1) Debounce the suggestion fetch (e.g., 500ms delay after mount before firing), (2) Lazy-load suggestions behind a 'Load suggestions' button, (3) Cache suggestions per fragmentSource to avoid re-fetching on revisit. This reduces unnecessary worker invocations and AI neuron consumption.

## Design

Preferred approach: add a short debounce (300-500ms) to the useEffect that triggers fetchSuggestions, combined with an in-memory LRU cache keyed by fragmentSource hash. This way, rapid navigation doesn't fire requests, and revisiting the same shader reuses cached suggestions.

## Acceptance Criteria

Suggestions are no longer eagerly fetched on every EditView mount. At least one optimization is applied (debounce, lazy load, or caching). Existing functionality preserved — user can still get all 3 suggestions. Tests updated.

