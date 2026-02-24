# Agent Instructions 🤖

Welcome, agent. You are working on the **Tiles** project. This file serves as your primary orientation and mandate.

## Core Mandates

1.  **Task Tracking**: Use the ticket system for all work.
    - Check `./tk ready` for available tasks (open/in-progress with dependencies resolved).
    - Start a task with `./tk start <id>`.
    - Create new tickets for sub-tasks or bugs discovered.
    - Close tasks with `./tk close <id>` only after verification.
    - **Note**: `./tk ready` shows unblocked tasks; `./tk blocked` shows blocked ones; `./tk closed` shows recently closed.
2.  **Documentation First**: Before making significant changes, consult `ARCHITECTURE.md` and `CONVENTIONS.md` in the project root.
    - For domain-specific knowledge, see `docs/README.md`.
    - Respect the "gardened" nature of the documentation.
    - Do not modify these core directive files unless specifically instructed.
3.  **IDE Agnostic**: Ensure your workflows and scripts remain portable. Do not rely on IDE-specific features for core functionality.
4.  **Security**: Never commit secrets, API keys, or sensitive data (like Cloudflare AI limits).
5.  **Testing**: Always include tests for new functionality, particularly using placeholder validation techniques for shader execution to avoid needing heavy GPU runs in CI environments.

## Workflow

1.  **Work Next**: When picking up new work or triggered via `/work-next` or `/work-all`:
    - Run `./tk ready` to identify the highest priority available task.
    - Run `./tk start <id>` to mark the ticket as in-progress.
    - Run `./tk show <id>` to orient yourself to the requirements and design.
    - After closing a ticket, commit and push changes before picking up the next task.
2.  **Discovery**: Explore the codebase, root documentation, and `docs/` to understand the context.
3.  **Strategy**: Propose a plan before execution.
4.  **Execution**:
    - Use the `./tk` symlink (pointing to `./scripts/ticket`) for task management.
    - Follow `CONVENTIONS.md`.
5.  **Validation**: Run tests and linting before finishing. Ensure dev environment respects configuration for local endpoints.

## Useful Commands

- `./tk help`: Show ticket system help.
- `./tk ready`: Show tasks ready to be worked on.
- `./tk show <id>`: Show details of a specific ticket.
- `/work-all`: Process all ready tickets sequentially (spawns subagent per ticket; verifies close, commit, push).
- `/file-tickets`: Break the conversation's conclusion into tickets under a new epic (mind dependencies).
- `npm run dev`: Run local Vite server and Wrangler worker proxy (frontend + worker).
- `npm test`: Run full-stack test suite (Vitest in frontend and worker).

---

*Last Updated: 2026-02-24*