---
id: wor-kl15
status: open
deps: [wor-uuyo, wor-sriu]
links: []
created: 2026-02-27T02:32:22Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-mqkc
---
# API integration hooks

Create custom React hooks wrapping the existing API layer (api.ts). Hooks: (1) useGenerateFromPrompt() — wraps generateFromPrompt with loading/error state, compile-retry logic (from add-from-prompt.ts), and integration with useAddShader. (2) useFetchSuggestions() — wraps fetchSuggestion to fire 3 parallel requests (conservative/moderate/wild) and return results as they arrive, with loading states per tier. (3) useApplyDirective() — wraps applyDirective with compile-retry logic (from apply-directive.ts), loading/error state. All hooks should expose standardized interfaces: { execute, data, isLoading, error }. Keep api.ts as the underlying HTTP layer. Move compile-retry logic from add-from-prompt.ts and apply-directive.ts into the hooks. Integrate with useToast for error notifications.

## Acceptance Criteria

useGenerateFromPrompt calls API and handles retry loop. useFetchSuggestions returns 3-tier suggestion results. useApplyDirective calls API with retry. All hooks expose loading/error state. Unit tests verify retry logic and state transitions using test harness mocks.

