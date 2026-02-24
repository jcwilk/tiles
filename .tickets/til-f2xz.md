---
id: til-f2xz
status: open
deps: []
links: []
created: 2026-02-24T09:56:45Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-kpwt
---
# Default shaders: pick up new entries and allow deletion of obsolete builtins

When default/seed shaders change (new entries added, old ones removed), the appliance stays cached. Need to: (1) pick up new default shader entries on load/migration, (2) treat shaders that are no longer in the current default set as deletable (not builtin). Builtin detection should reflect current seed definitions, not just seed-* ID prefix.

