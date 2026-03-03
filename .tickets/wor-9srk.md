---
id: wor-9srk
status: closed
deps: [wor-8dsq]
links: []
created: 2026-03-03T07:08:28Z
type: feature
priority: 1
assignee: Cursor Agent
parent: wor-e9ob
tags: [feature, frontend, deploy, github-pages]
---
# Add 404.html SPA fallback for GitHub Pages deep links

GitHub Pages returns a 404 for any URL path that doesn't map to a real file. This breaks direct navigation and page refreshes on sub-routes like /<repo>/tile/<id>. Need a 404.html that redirects to index.html so the SPA router can handle the path.

## Design

Create frontend/public/404.html using the standard GitHub Pages SPA redirect technique: the 404 page stores the original path in a sessionStorage key and redirects to the app root; a small script in index.html reads the stored path and calls history.replaceState to restore it before React mounts. This allows the SPA router to handle all routes. Alternatively, a simpler approach: 404.html can use a meta-refresh or JS redirect to /<base>/?p=<encoded-path>, and index.html can decode it. The community-standard approach (rafrex/spa-github-pages) is well-tested.

## Acceptance Criteria

1. Navigating directly to /<repo>/tile/<id> loads the fullscreen view (not a 404 page). 2. Refreshing the browser on any route restores the correct view. 3. The redirect does not break query parameters or hash fragments.

