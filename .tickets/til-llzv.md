---
id: til-llzv
status: closed
deps: [til-uoxd, til-v29p]
links: []
created: 2026-02-24T08:02:32Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-4lmn
---
# Create scripts/ratelimit CLI with usage, limits, alerts subcommands

Create scripts/ratelimit bash script and ./rl symlink. Subcommands: usage (--hour, --day, --ip), limits (show/set), alerts (show/set/enable/disable). Progressive-discovery help. Uses wrangler kv and GET /usage.

## Acceptance Criteria

./rl help lists subcommands; ./rl usage shows hour+day; ./rl limits set works; ./rl alerts configurable

