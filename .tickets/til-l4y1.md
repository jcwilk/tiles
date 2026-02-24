---
id: til-l4y1
status: open
deps: [til-yoe8]
links: []
created: 2026-02-24T09:35:50Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-mnz2
---
# Prevent deletion of built-in tiles

Seed shaders (IDs matching seed-*) are the six original tiles (Gradient, Plasma, Noise, Circles, Stripes, Rainbow). Users should not be able to delete these. Hide the delete button for built-in tiles; user-created and merged tiles remain deletable.

## Acceptance Criteria

1. Built-in tiles (id starts with seed-) have no delete button. 2. User-created and merged tiles show delete button and can be deleted. 3. Tests cover both cases.

