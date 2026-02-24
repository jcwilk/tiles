# Agent Instructions 🤖

Welcome, agent. You are working on the **Tiles** project. This file serves as your primary orientation and mandate.

## Core Mandates

1.  **Task Tracking**: Use the ticket system for all work.
    - Check `./tk ready` for available tasks (open/in-progress with dependencies resolved).
    - Start a task with `./tk start <id>`.
    - Create new tickets for sub-tasks or bugs discovered.
    - Close tasks with `./tk close <id>` only after verification.
    - **Note**: `./tk ready` shows unblocked tasks; `./tk blocked` shows blocked ones; `./tk closed` shows recently closed.
    - **Task completion is incomplete without commit and push.** When you finish a ticket — including when working as a subagent — you MUST stage all changes, commit with a descriptive message, and push to remote. Do not leave uncommitted or unpushed work. A closed ticket with a dirty tree or unpushed commits is not done.
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
    - **Before finishing**: Run `./tk close <id>`, then stage all changes, commit, and push. Do not consider the task complete until `git status` is clean and changes are pushed. This applies to subagents as well — if you are spawned to work a ticket, your final step must be commit and push.
2.  **Discovery**: Explore the codebase, root documentation, and `docs/` to understand the context.
3.  **Strategy**: Propose a plan before execution.
4.  **Execution**:
    - Use the `./tk` symlink (pointing to `./scripts/ticket`) for task management.
    - Follow `CONVENTIONS.md`.
5.  **Validation**: Run tests and linting before finishing. Ensure dev environment respects configuration for local endpoints. Before declaring a ticket done, verify `git status` shows a clean working tree and no unpushed commits.

## Useful Commands

See [TOOLS.md](TOOLS.md) for full script reference.

- `./tk help`: Show ticket system help.
- `./tk ready`: Show tasks ready to be worked on.
- `./tk show <id>`: Show details of a specific ticket.
- `./lint`: Run TypeScript check (lint) across frontend and worker.
- `/work-all`: Process all ready tickets sequentially (spawns subagent per ticket; verifies close, commit, push).
- `/file-tickets`: Break the conversation's conclusion into tickets under a new epic (mind dependencies).
- `npm run dev`: Run local Vite server and Wrangler worker proxy (frontend + worker).
- `npm test`: Run full-stack test suite (Vitest in frontend and worker).

## Cursor Cloud specific instructions

- **Monorepo layout**: npm workspaces with `frontend/` (Vite + TypeScript SPA) and `worker/` (Cloudflare Worker via Wrangler). Root `package.json` orchestrates both.
- **Environment file**: Copy `.env.example` → `.env` if it doesn't exist. Default `VITE_API_URL=http://localhost:8787` is correct for local dev.
- **Dev servers**: `npm run dev` starts both Vite (port 5173) and Wrangler (port 8787) concurrently. The worker's root `/` returns 404 — use `GET /usage` to verify it's running.
- **Lint / Test / Build**: `npm run lint`, `npm test`, `npm run build` — all documented in `TOOLS.md`. Unit tests run fully offline with mocks (no GPU, no network, no Cloudflare credentials needed).
- **AI merge requires Cloudflare credentials**: Dragging tiles to merge calls Cloudflare Workers AI. Without `npx wrangler login` or `CLOUDFLARE_API_TOKEN`, merges will fail at the network layer — but all other app features (tile rendering, expansion, navigation, storage) work locally without credentials.
- **E2E tests** (`npm run test:e2e -w frontend`) require Playwright Chromium installed (`npx playwright install chromium`) and both dev servers running.

---

*Last Updated: 2026-02-24*