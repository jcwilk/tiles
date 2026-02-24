---
id: til-rwze
status: closed
deps: []
links: []
created: 2026-02-24T20:00:11Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-t0a0
---
# Add ci script for npm ci (Cursor whitelist)

Create a script (e.g. scripts/ci or scripts/install) that runs npm ci from the project root. Follow existing script patterns (lint, test-add-from-voice): bash, set -euo pipefail, resolve ROOT_DIR from SCRIPT_DIR. Add root symlink (e.g. ./ci -> scripts/ci). Update TOOLS.md. Purpose: allow Cursor to whitelist this single script for safe dependency installs instead of raw npm ci.

