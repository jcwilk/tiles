---
id: til-cfnk
status: open
deps: [til-cled, til-bvno, til-hq81]
links: []
created: 2026-02-25T02:13:15Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Tests for edit interface

Add tests for the new worker endpoints and frontend edit-view logic. Worker: test POST /suggest (valid request, each adventurousness tier, invalid body, rate limiting). Test POST /apply-directive (valid with/without context shaders, invalid body, rate limiting). Frontend: test apply-directive.ts compile-retry loop with [VALID CODE]/[INVALID CODE] placeholders per CONVENTIONS.md. Test suggest.ts parallel request firing and callback delivery. Test speech-recognition.ts feature detection. Test edit-view.ts rendering and interaction (suggestion click, pencil toggle, context selection).

## Acceptance Criteria

Worker endpoint tests pass for /suggest and /apply-directive (happy path, error cases, rate limits). Frontend logic tests pass for apply-directive retry loop, suggest parallel requests, speech-recognition feature detection. Edit view rendering test verifies key DOM elements.

