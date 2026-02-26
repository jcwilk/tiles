---
id: til-538q
status: open
deps: []
links: []
created: 2026-02-26T00:24:43Z
type: bug
priority: 2
assignee: John Wilkinson
---
# Cap AI suggestion temperatures (0.1 / 0.2 / 0.3 max)

The "wild" suggestion tier produces gibberish because its temperature (1.2) is too high. All tiers need to be reduced.

## Current values (worker/src/index.ts ~line 297)

- conservative: 0.3
- moderate: 0.7
- wild: 1.2
- Fallback default on line 356: `?? 0.7`

## New values (hard caps)

- conservative: 0.1
- moderate: 0.2
- wild: 0.3
- Fallback default: `?? 0.2` (must also respect the 0.3 ceiling)

## Key constraint

Temperature must NEVER exceed 0.3 anywhere in the codebase. The fallback on line 356 (`ADVENTUROUSNESS_TEMPERATURE[adventurousness] ?? 0.7`) must also be updated.

## Location

- `worker/src/index.ts` — `ADVENTUROUSNESS_TEMPERATURE` record (~line 297-301)
- `worker/src/index.ts` — fallback default (~line 356)

## Verification

- `grep -rn 'temperature' worker/` — confirm no value exceeds 0.3
- `npm test` — all tests pass
- `npm run lint` — lint passes
- Live AI verification (coherent suggestions) requires Cloudflare credentials and is out of scope for local dev; manual QA against deployed worker if available

## Acceptance Criteria

1. `ADVENTUROUSNESS_TEMPERATURE` values: conservative=0.1, moderate=0.2, wild=0.3
2. Fallback default changed from 0.7 to 0.2
3. No temperature value in the codebase exceeds 0.3
4. Tests pass, lint passes

