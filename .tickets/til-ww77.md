---
id: til-ww77
status: closed
deps: [til-a78e]
links: []
created: 2026-02-24T19:54:12Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-wmtr
---
# Rewrite rl tool in TypeScript

Port all existing features from scripts/ratelimit (242 lines of bash) to scripts/rl.ts. The 5 known bash bugs ("Value not found" handling in limits show/alerts show; unbound variable crashes in limits set, alerts set, usage --ip) are fixed naturally in the rewrite. Subcommands to port: usage (GET /usage + optional IP-specific KV via wrangler), limits show/set (config:limits in KV), alerts show/set/enable/disable (config:alerts in KV), help for each subcommand. Key considerations: shell out to npx wrangler for KV ops; handle wrangler's "Value not found" stdout-with-exit-0; use native fetch() for HTTP calls; JSON parsing is trivial in TS vs jq. Deliverables: new scripts/rl.ts, delete scripts/ratelimit (bash), update ./rl symlink. CAUTION when verifying write commands: read current value first, write back the same value, restore state if key was previously unset.

