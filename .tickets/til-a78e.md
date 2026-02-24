---
id: til-a78e
status: closed
deps: []
links: []
created: 2026-02-24T19:54:00Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-wmtr
---
# Set up TypeScript CLI infrastructure (tsx + tsconfig)

Add tsx to root devDependencies to enable #!/usr/bin/env tsx shebangs for CLI scripts. Create scripts/tsconfig.json extending from worker/tsconfig.json with appropriate module settings. Establish the pattern: scripts/foo.ts with shebang, symlinked from ./foo at project root. Verify the pattern works with a minimal hello-world script before proceeding.

