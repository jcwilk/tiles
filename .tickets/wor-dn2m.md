---
id: wor-dn2m
status: open
deps: []
links: []
created: 2026-02-26T23:59:48Z
type: epic
priority: 2
assignee: Cursor Agent
---
# Epic: Automated interaction tests for fullscreen/edit navigation lifecycle

The demo video revealed three categories of broken interaction: (1) fullscreen overlay buttons (edit, close) are unresponsive or have multi-second lag, (2) edit view can open even after the user attempted to close fullscreen, indicating a state/event race, and (3) after returning from fullscreen to grid, tile click handlers are dead (zombie state). These all stem from untested interactions between the fullscreen overlay, edit view, browser history, and grid event wiring. This epic covers automated unit/integration tests (Vitest + jsdom) for the navigation state machine and interaction lifecycle, using the patterns already in edit-view.test.ts and click-utils.test.ts.

