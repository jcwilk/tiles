---
id: til-a1r4
status: open
deps: []
links: []
created: 2026-02-24T09:56:44Z
type: bug
priority: 2
assignee: John Wilkinson
parent: til-kpwt
---
# Add-from-voice: clear recording state and prevent double-click errors

When add-by-recording starts, clicking again is unclear (recording may not have stopped) and causes errors. Improve UX: make recording state obvious, ensure stop is called before starting new recording, optionally add tap-to-stop. Prevent errors when user clicks Add tile again during/after recording.

