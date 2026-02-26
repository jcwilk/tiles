---
id: til-fj5d
status: open
deps: []
links: []
created: 2026-02-26T00:24:54Z
type: task
priority: 2
assignee: John Wilkinson
parent: til-n5ip
---
# Research: Cursor sub-agents and .cursor/.agents configuration

Research how Cursor sub-agents work, specifically ones that can be defined under `.cursor/.agents` (or `.cursor/agents/`). This is becoming increasingly important with the new computer control capabilities in Cursor Cloud, which work best with the smartest models (like Opus).

## Research goals:
1. **Sub-agent definition format** — How to define custom agents under `.cursor/.agents`. What files/format are expected? YAML, JSON, markdown?
2. **Agent capabilities** — What tools/permissions can sub-agents access? Can they use computer control (browser automation, screenshot analysis)?
3. **Cursor Cloud integration** — How do sub-agents interact with Cursor Cloud's computer control features? What models are available and recommended?
4. **Best practices** — Any documented patterns for organizing agents in a project? How do teams use them effectively?
5. **Limitations** — Known constraints, model availability, cost considerations, rate limits.
6. **Relevance to Tiles** — How could we leverage sub-agents for this project? E.g., automated testing agents, code review agents, deployment agents.

## Output:
Create a new document at `docs/cursor-sub-agents.md` (or similar) summarizing findings with:
- Overview of the feature
- Configuration format and examples
- Recommended patterns for our project
- Links to official documentation
- Notes on Cursor Cloud computer control capabilities and model recommendations (Opus, etc.)

## Sources to check:
- Cursor official docs
- .cursor/ directory conventions
- Community resources, forums, changelogs
- Any existing .cursor/ configuration in this repo

## Acceptance Criteria

1. Research document created in docs/ folder
2. Covers sub-agent definition format, capabilities, Cursor Cloud integration
3. Includes practical recommendations for the Tiles project
4. Document is well-organized and actionable

