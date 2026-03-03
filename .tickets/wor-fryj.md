---
id: wor-fryj
status: closed
deps: []
links: []
created: 2026-03-01T03:18:07Z
type: chore
priority: 3
assignee: Cursor Agent
parent: wor-yjcs
tags: [frontend, performance]
---
# Memoize ToastContext provider value to prevent unnecessary re-renders

In toast-context.tsx, the ToastProvider creates a new context value object on every render (line 101: const value = { showToast, dismissToast }). While showToast and dismissToast are individually stable via useCallback, the context value object itself is not memoized. React context triggers re-renders of ALL consumers when the value object changes referentially. Since ToastProvider re-renders on every toast add/remove, this causes unnecessary re-renders of every component using useToast(). Wrap the value in useMemo to prevent this.

## Acceptance Criteria

ToastContext.Provider value is memoized with useMemo([showToast, dismissToast]). No unnecessary re-renders of toast context consumers. Tests pass.

