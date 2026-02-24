---
id: til-3p5j
status: closed
deps: []
links: []
created: 2026-02-24T08:35:41Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-ti0f
---
# Add scripts/lint and ./lint symlink

Create scripts/lint executable shell script that invokes tsc directly via node_modules/.bin/tsc (no npm). Runs tsc --noEmit -p frontend and -p worker. Add symlink ./lint -> scripts/lint to match ./tk and ./rl pattern.

