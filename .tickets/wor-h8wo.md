---
id: wor-h8wo
status: open
deps: [wor-1nrd]
links: []
created: 2026-02-27T02:34:53Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-mqkc
---
# E2E tests for React app

Write or update Playwright E2E tests to cover the React app's critical user flows. Tests: (1) Grid view loads with seed tiles. (2) Tap tile opens fullscreen view. (3) Fullscreen close returns to grid. (4) Fullscreen edit button opens edit view. (5) Edit view shows suggestions (mock API). (6) Custom directive submission (mock API). (7) Add tile from prompt (mock API). (8) Delete a non-builtin tile. (9) Browser back/forward navigation between views. (10) Deep link to fullscreen view. (11) Responsive grid (mobile vs desktop viewports). These tests replace any existing E2E tests for the old vanilla UI. Use the existing Playwright setup. Mock the worker API at the network level to keep tests offline.

## Acceptance Criteria

Playwright E2E tests cover all listed user flows. Tests pass against the React app with mocked API. Tests run in CI without GPU or network. Browser navigation works correctly in tests. No flaky tests.

