# Cursor Sub-Agents — Research Summary

Timeboxed research (til-fj5d) into Cursor's sub-agent configuration. Links to official docs are preferred over duplicating content.

## Primary Sources

- **Subagents**: https://cursor.com/docs/context/subagents
- **Subagents configuration fields**: https://cursor.com/docs/context/subagents#configuration-fields
- **Cloud Agent setup**: https://cursor.com/docs/cloud-agent/setup
- **Cloud Agent best practices**: https://cursor.com/docs/cloud-agent/best-practices
- **Rules (for orchestration)**: https://cursor.com/docs/context/rules

---

## Configuration Format

Subagents are configured under `.cursor/`. Cursor uses:

- **Rules**: `.cursor/rules/` — Markdown (`.md`) or MDC (`.mdc`) with YAML frontmatter. Used for orchestration and delegation.
- **Commands**: `.cursor/commands/` — Custom slash commands that can spawn subagents.
- **Agents**: Custom subagents can be defined for reuse; the exact folder (`.cursor/agents/` or `.cursor/.agents`) and format (YAML, JSON, markdown) are documented at the links above. Consult the official docs for the current schema.

### Minimal Working Example (Rules-Based Delegation)

This project already uses `.cursor/commands/work-all.md` to orchestrate subagents via `mcp_task` with `subagent_type: "generalPurpose"`. A minimal rule that delegates to a subagent:

```markdown
---
description: Delegate E2E testing to a specialized agent.
globs: ["frontend/**/*.spec.ts", "**/e2e/**"]
alwaysApply: false
---

When running E2E tests, spawn a subagent with instructions to:
1. Run `npm run test:e2e -w frontend`
2. Ensure dev server and worker are running first
3. Report pass/fail and any flaky tests.
```

---

## Capabilities and Limitations

### Built-in Subagents (No Config Required)

| Subagent | Purpose | Tools |
|----------|---------|-------|
| **Explore** | Search and analyze codebase | Codebase search, faster model |
| **Bash** | Run shell command series | Shell, isolated output |
| **Browser** | Control browser | MCP tools, DOM snapshots |

### Configuration Options (Custom Subagents)

- **Custom prompts** — Tailor instructions for specific tasks
- **Tool access** — Control which tools the subagent can use
- **Models** — Specify which AI model the subagent uses
- **Execution mode** — Foreground (blocking) or background (async)

### Limitations

- **Context isolation**: Subagents run in separate context windows; long research doesn't consume main conversation space.
- **Cloud Agent**: Subagent delegation in Cloud Agents has had documented issues; verify behavior on your plan.
- **Model selection**: Only Max Mode–compatible models available for Cloud Agents. Legacy request-based plans without Max Mode use Composer regardless of config.
- **Computer use**: Not supported for repos with Dockerfiles or `environment.json` configured.

---

## Tiles-Specific Recommendations

### 1. E2E Test Agent

Define a subagent (or command) that runs Playwright E2E tests. It should:
- Start dev servers if needed (`npm run dev`)
- Run `npm run test:e2e -w frontend`
- Require Chromium: `npx playwright install chromium`
- Report results and flaky tests

**Benefit**: Isolates E2E runs from main agent context; avoids GPU/network assumptions in the primary flow.

### 2. Deployment / CI Verification Agent

An agent focused on deploy and CI health:
- Run `npx wrangler deploy --dry-run` in `worker/`
- Validate GitHub Actions workflow syntax
- Check `wrangler.toml` placeholders (e.g. KV namespace injection)
- Reference `docs/deploy-troubleshooting.md`

**Benefit**: Reduces deploy failures by catching config issues before push.

### 3. Prompt Eval / Merge Fixture Agent

For prompt evaluation and fixture recording (see `docs/README.md` and `docs/prompt-eval-decision.md`):
- Run `npm run test:eval` (validate) or `npm run test:eval:record` (re-record)
- Requires worker running; uses live `/generate` endpoint
- Gate behind `PROMPT_EVAL=1` to avoid accidental runs in CI

**Benefit**: Keeps prompt eval workflow consistent and documented for agents.

---

## Monorepo Best Practices

- **Nested rules**: Use `.cursor/rules/` with globs to scope rules to `frontend/`, `worker/`, etc.
- **Single root**: Open the monorepo root so the agent indexes all workspaces.
- **Incremental tasks**: Scope prompts to smaller units (e.g. one ticket, one package) to avoid context overload.
- **Git worktrees**: For parallel agents, use worktrees to avoid conflicts; run one agent per worktree/branch.

---

*Last Updated: 2026-02-26*
