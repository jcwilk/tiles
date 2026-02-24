---
id: til-negk
status: open
deps: []
links: []
created: 2026-02-24T09:44:44Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-5o54
---
# Configure GitHub Pages source to GitHub Actions

In the repo Settings → Pages, set the source to **GitHub Actions** (not a branch). The deploy workflow already builds and uploads the frontend artifact; Pages must be configured to use it. Without this, the site at https://jcwilk.github.io/tiles/ will not be served.

