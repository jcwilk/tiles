---
id: wor-96ig
status: open
deps: [wor-bstc]
links: []
created: 2026-02-27T02:33:55Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-mqkc
---
# Viewport observation hook (useVisibility)

Create a useVisibility(ref) custom hook that wraps IntersectionObserver to track whether a component's element is in the viewport. Returns { isVisible: boolean }. This replaces the current viewport-observer.ts imperative approach. The hook should: (1) Observe the element referenced by ref. (2) Update isVisible on intersection changes. (3) Clean up observer on unmount. (4) Be used by Tile to auto-set WebGL context pool priority (visible → higher priority, offscreen → lower). Optionally accept IntersectionObserver options (threshold, rootMargin). Simple, focused hook with a clean testable interface.

## Acceptance Criteria

useVisibility returns isVisible boolean. Value updates when element enters/leaves viewport. Observer is cleaned up on unmount. Tile component uses hook to set context priority. Unit tests verify visibility state changes with mock IntersectionObserver.

