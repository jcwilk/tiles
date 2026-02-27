---
id: wor-9dtt
status: open
deps: []
links: []
created: 2026-02-27T00:00:57Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-dn2m
---
# Test: delete button click does not trigger fullscreen (event propagation)

The click-utils.test.ts file tests isDeleteOrControlClick in isolation, but there is no integration test verifying that clicking a tile's delete button actually deletes the tile without opening fullscreen. The demo video showed the automated clicker repeatedly opening fullscreen when trying to hit the small delete button, which could also happen to users on mobile/touch. Add an integration test that: (1) creates a tile with an onDelete callback; (2) registers a click handler on the tile element that calls openFullscreen (mirroring main.ts); (3) dispatches a click event targeted at the delete button; (4) asserts onDelete was called and openFullscreen was NOT called. Also test the text-node click case (clicking the × character itself). Existing click-utils.test.ts covers detection; this test covers the full event flow including stopPropagation.

## Acceptance Criteria

Tests pass in CI. A click event dispatched on .tile-delete (or its text node) fires onDelete, does not fire the tile's openFullscreen handler. stopPropagation is verified by checking that the parent click handler never runs.

