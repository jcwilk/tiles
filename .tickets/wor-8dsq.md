---
id: wor-8dsq
status: open
deps: []
links: []
created: 2026-03-03T07:08:15Z
type: bug
priority: 0
assignee: Cursor Agent
parent: wor-e9ob
tags: [bug, frontend, router, github-pages]
---
# Add basename to BrowserRouter for GitHub Pages subpath routing

BrowserRouter in frontend/src/main.tsx has no basename prop. When deployed to GitHub Pages at https://<user>.github.io/<repo>/, the browser path is /<repo>/ but routes only match /. No route matches, so nothing renders — user sees the dark #1a1a1a body background (black screen).

## Design

Read import.meta.env.BASE_URL (Vite sets this from the base config in vite.config.ts) and pass it as basename to BrowserRouter. Strip trailing slash since react-router expects basename without one. In vite.config.ts, base is already set to process.env.VITE_BASE_URL ?? '/', and the deploy workflow sets VITE_BASE_URL=/<repo-name>/. So import.meta.env.BASE_URL will be /<repo-name>/ in production and / locally.

## Acceptance Criteria

1. On GitHub Pages at /<repo>/, the grid view loads and tiles are visible (not a black screen). 2. Local dev (base=/) continues to work unchanged. 3. Existing tests pass.

