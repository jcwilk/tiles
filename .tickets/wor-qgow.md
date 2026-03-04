---
id: wor-qgow
status: closed
deps: [wor-1nqe]
links: []
created: 2026-03-01T03:17:25Z
type: feature
priority: 1
assignee: Cursor Agent
parent: wor-yjcs
tags: [frontend, optimization, api]
---
# Add AbortController to frontend API calls and cancel on unmount

No API calls in the frontend use AbortController. When a user navigates away from EditView before suggestions load, 3 parallel /suggest requests continue to completion on the worker, wasting worker CPU time and AI neurons. Similarly, if a user navigates away during a /generate-from-prompt or /apply-directive retry loop, all in-flight and remaining retry requests run to completion. Add AbortController support to: (1) useFetchSuggestions — abort all 3 /suggest calls on cleanup, (2) useGenerateFromPrompt — abort current /generate-from-prompt on cleanup, (3) useApplyDirective — abort current /apply-directive on cleanup. Pass the signal through to fetch() in api.ts. Handle AbortError gracefully (don't show error toasts for aborted requests).

## Design

In api.ts, add an optional AbortSignal parameter to generateFromPrompt, fetchSuggestion, and applyDirective. In each hook, create an AbortController, pass its signal to the API function, and abort in the cleanup/unmount path. For useFetchSuggestions, the useEffect in EditView should return a cleanup function that calls abort. For retry loops, check if the signal is aborted before each attempt.

## Acceptance Criteria

All API hooks create and use AbortController. useEffect cleanup functions abort in-flight requests. Navigating away from EditView cancels pending /suggest calls. AbortError is silently caught. Existing tests updated and passing.

