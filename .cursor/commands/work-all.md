---
description: Work through all ready tickets sequentially, spawning a subagent per ticket and ensuring each is closed, committed, and pushed before proceeding.
---

# Work All Tickets 🚀

Process **all** ready tickets one by one. For each ticket, spawn a subagent to complete the work, then verify the ticket was closed and changes were committed and pushed before moving to the next.

## Workflow

1. **Gather ready tickets**: Run `./tk ready` to get the list of unblocked tickets.
2. **If none**: Report "No ready tickets" and stop.
3. **For each ticket** (in order, one at a time to avoid git conflicts):
   - **Spawn subagent**: Use `mcp_task` with `subagent_type: "generalPurpose"` to work the ticket. The prompt must include:
     - The ticket ID and a directive to run `./tk show <id>` for full context.
     - Instructions to follow the Work Next workflow from [AGENTS.md](../../AGENTS.md): start the ticket, do discovery, strategy, execution, validation.
     - A **mandatory** final step: close the ticket with `./tk close <id>`, then commit and push all changes.
   - **Verify completion** (orchestrator must check before proceeding):
     - `./tk show <id>` — status must be `closed`.
     - `git status` — working tree must be clean (no uncommitted changes).
     - `git log -1 --oneline` — confirm a recent commit for this work.
     - `git status` with respect to remote — ensure changes are pushed (e.g. `git status` shows "Your branch is up to date" or equivalent; if ahead, run `git push`).
   - If verification fails: report the failure, do not proceed to the next ticket until the user resolves it or explicitly instructs to continue.
4. **Report**: After all tickets are done, summarize what was completed.

## Important

- **Sequential processing**: Do not run multiple ticket workers in parallel. Git conflicts are likely if two agents commit simultaneously.
- **Orchestrator responsibility**: You (the agent running this command) are the orchestrator. You spawn subagents and **must** verify each ticket's completion before moving on.
- **Commit and push**: Each ticket's work must be committed and pushed. Do not leave uncommitted or unpushed changes.
