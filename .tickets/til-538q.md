---
id: til-538q
status: open
deps: []
links: []
created: 2026-02-26T00:24:43Z
type: bug
priority: 1
assignee: John Wilkinson
parent: til-n5ip
---
# Cap AI suggestion temperatures (0.1 / 0.2 / 0.3 max)

The third auto-generated suggestion option ("wild" tier) in the edit view produces random gobbledygook — likely because the temperature is way too high (currently 1.2). The temperature settings need to be drastically reduced across all tiers.

## Current values (worker/src/index.ts ~line 297):
- conservative: 0.3
- moderate: 0.7
- wild: 1.2

## New values (hard caps):
- conservative: 0.1 (most deterministic — should produce very predictable, safe modifications)
- moderate: 0.2 (middle ground — slightly more creative but still coherent)
- wild: 0.3 (maximum creativity allowed — should still produce valid, meaningful shader code, NOT random nonsense)

## Key constraint:
Temperature should NEVER exceed 0.3 anywhere in the codebase. This is a hard cap. If there are any other places where temperature is set or configurable, they must also respect this ceiling.

## Location:
- `worker/src/index.ts` — `ADVENTUROUSNESS_TEMPERATURE` record (~line 297-301)
- Used in the `/suggest` endpoint when calling AI.run()

## Verification:
- Generate suggestions in edit view for multiple tiles
- All three tiers should produce coherent, meaningful shader modification suggestions
- The 'wild' option should be creative but not gibberish
- grep for 'temperature' in the codebase and confirm no value exceeds 0.3

## Acceptance Criteria

1. ADVENTUROUSNESS_TEMPERATURE values updated to conservative=0.1, moderate=0.2, wild=0.3
2. No temperature value in the codebase exceeds 0.3
3. All three suggestion tiers produce coherent, valid suggestions
4. Tests pass, lint passes

