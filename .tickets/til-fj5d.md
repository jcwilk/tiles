---
id: til-fj5d
status: open
deps: []
links: []
created: 2026-02-26T00:24:54Z
type: task
priority: 2
assignee: John Wilkinson
---
# Research: Cursor sub-agents and .cursor/.agents configuration

Timeboxed research (1–2 hours max) into Cursor's sub-agent configuration. This is a documentation-only task — no code changes.

## Research goals

1. Sub-agent definition format under `.cursor/.agents` or `.cursor/agents/` (YAML, JSON, markdown?)
2. Available tools/permissions for sub-agents (computer control, file access, shell)
3. Cursor Cloud integration and model selection (which models support which capabilities)
4. Any documented best practices for organizing agents in a monorepo

## Output

Create `docs/cursor-sub-agents.md` with:
- Configuration format and a minimal working example
- Summary of capabilities and limitations
- 2–3 concrete recommendations for the Tiles project (e.g. E2E test agent, deployment agent)
- Links to official docs

## Sources

- Cursor docs: https://cursor.com/docs/context/subagents#configuration-fields
- Existing `.cursor/` directory in this repo
- Community forums / changelogs (skim only — do not rabbit-hole)

## Acceptance Criteria

1. `docs/cursor-sub-agents.md` created
2. Covers format, capabilities, and Tiles-specific recommendations
3. Document is concise (under 200 lines) and links to primary sources rather than duplicating them

