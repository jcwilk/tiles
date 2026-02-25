# Tools & Scripts Reference

Reference for scripts and commands used in development and operations.

## Root Scripts (symlinks)

Run from project root. Symlinks point to `scripts/`.

| Command | Purpose |
|---------|---------|
| `./tk` | Ticket system with dependency tracking. Create, start, close, and manage tickets in `.tickets/`. Run `./tk help` for full usage. Key commands: `ready`, `blocked`, `closed`, `show <id>`, `create`, `dep tree <id>`, `dep cycle`. |
| `./rl` | Rate limit CLI (TypeScript). Usage, limits, alerts, and cost. Uses Wrangler KV and `GET /usage` from the worker. Requires worker running. `RATE_LIMIT_API_URL` (default: http://localhost:8787). Run `./rl help` for subcommands. |
| `./srv` | Server status and management (TypeScript). Check local/remote endpoints (`status`, `status local`, `status remote`), start/stop/restart dev servers. `VITE_DEV_URL`, `WORKER_DEV_URL` for local; `SRV_REMOTE_FRONTEND_URL`, `SRV_REMOTE_WORKER_URL` for remote. Run `./srv help` for usage. |
| `./ci` | Run `npm ci` from project root. Whitelist this script in Cursor for safe dependency installs. |
| `./lint` | TypeScript check (`tsc --noEmit`) for frontend and worker. Invokes tsc directly (no npm). |
| `./test-add-from-voice` | Run add-from-voice Vitest test only. Use for quick pre-deploy validation when Cloudflare deploy failures require re-running this test. |

### Cost monitoring (`./rl cost`)

`./rl cost` shows three sections: (1) **Actual spend** from Cloudflare GraphQL API (requires `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), (2) **Estimated spend** from worker `/usage` counters, and (3) **Max potential** at current rate limits. See [docs/rate-limiting.md](docs/rate-limiting.md) for details.

## npm Scripts (root)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite (frontend) and Wrangler (worker) in parallel. Frontend: port 5173, worker: port 8787. |
| `npm test` | Run Vitest across frontend and worker. Excludes prompt-eval tests. |
| `npm run build` | Build frontend and worker. |
| `npm run lint` | Run workspace linters (tsc --noEmit). Equivalent to `./lint` via npm. |

## Workspace-Specific

Commands run from `frontend/` or `worker/` (or via `-w frontend` / `-w worker`).

| Command | Purpose |
|---------|---------|
| `npm run test:e2e -w frontend` | Playwright E2E tests. Requires dev server and worker running. Set `PLAYWRIGHT_BASE_URL` if using non-default port. |
| `npm run test:eval -w worker` | Prompt eval: validate fixtures (structural GLSL). Gated; requires `PROMPT_EVAL=1`. See [docs/README.md](docs/README.md). |
| `npm run test:eval:record -w worker` | Re-record prompt-eval fixtures. Worker must be running. See [docs/README.md](docs/README.md). |

## See Also

- [AGENTS.md](AGENTS.md) — Agent workflow and mandates
- [docs/README.md](docs/README.md) — Prompt evaluation workflow, domain topics
- [README.md](README.md) — Setup, environment, deployment

---

*Last Updated: 2026-02-25*
