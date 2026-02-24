# Docs — Reference Material 📚

This directory contains domain-specific knowledge and topic-specific deep dives.

- *(Future Link)*: WebGL Sandbox & Backbuffer implementation details.
- [Prompt Evaluation Tooling — Research Decision](prompt-eval-decision.md)
- *(Future Link)*: AI Prompts and LLM Code Generation Strategy.
- *(Future Link)*: Rate Limiting & Cloudflare Security Constraints.

---

## Prompt Evaluation Workflow

Prompt eval tests validate AI-generated GLSL against fixtures. They are **gated** and never run via `npm test`.

### Commands

| Command | Purpose |
|---------|---------|
| `npm run test:eval` (in worker) | Validate fixtures: check staleness and structural GLSL. Requires `PROMPT_EVAL=1` (set by script). |
| `npm run test:eval:record` (in worker) | Re-record fixtures by calling the live worker `/generate` endpoint. Start the worker with `npm run dev -w worker` first. |

### Workflow

1. **Validate**: Run `cd worker && npm run test:eval` to ensure fixtures are current and outputs pass structural validation.
2. **Re-record**: If you change the merge prompt or seed shaders, fixtures become stale. Run `npm run test:eval:record` with the worker running to update `worker/src/__fixtures__/*.json`.
3. **Staleness**: Each fixture stores an `inputHash` of `(fragmentA, fragmentB, previousError, prompt template)`. If the hash changes, the test fails with: *Fixture stale: prompt or inputs changed. Run 'npm run test:eval:record' to re-record.*

### Fixture format

Fixtures live in `worker/src/__fixtures__/` as JSON: `gradient-plasma.json`, `noise-circles.json`, `stripes-rainbow.json`. Each contains `inputHash`, `fragmentA`, `fragmentB`, `previousError`, `output`, and `recordedAt`.

---

*Last Updated: 2026-02-23*