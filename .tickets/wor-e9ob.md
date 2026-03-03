---
id: wor-e9ob
status: open
deps: []
links: []
created: 2026-03-03T07:08:01Z
type: epic
priority: 0
assignee: Cursor Agent
tags: [bug, deploy, github-pages]
---
# Fix GitHub Pages black screen

The app shows a black screen when visited on GitHub Pages. Root cause: BrowserRouter lacks a basename matching the subpath GitHub Pages serves from, and there is no 404.html SPA fallback for deep links.

