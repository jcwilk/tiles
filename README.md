# Tiles

An experimental web application where users combine actively running WebGL shaders via an intuitive drag-and-drop interface, leveraging AI to generate new combined visual experiences.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Cloudflare Wrangler CLI (installed via `npm install` in worker)

### Installation

```bash
git clone <repository-url>
cd tiles
npm install
```

### Environment

Copy `.env.example` to `.env` and adjust for your setup:

```bash
cp .env.example .env
```

- **Local dev**: `VITE_API_URL=http://localhost:8787` (default)
- **Production**: Set `VITE_API_URL` to your deployed Cloudflare Worker URL before building the frontend.

### Running

Start both frontend (Vite) and worker (Wrangler) in development:

```bash
npm run dev
```

This runs `vite` in `frontend/` (port 5173) and `wrangler dev` in `worker/` (port 8787). Open http://localhost:5173.

### Testing

The testing suite uses Vitest. Tests avoid real GPU/network calls via placeholder validation (see CONVENTIONS.md).

```bash
npm test
```

### Build

```bash
npm run build
```

## Project Structure

- `frontend/` — Vite + TypeScript web app (GitHub Pages)
- `worker/` — Cloudflare Worker AI proxy (Wrangler)

### Workers AI Local Auth

Workers AI connects to Cloudflare's remote API even in local dev. Log in with `npx wrangler login`. If you still get "Not logged in" or "Failed to fetch auth token", use an API token instead:

1. Create an API token at [Cloudflare Dashboard → Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) (use "Edit Cloudflare Workers" template).
2. Run: `CLOUDFLARE_API_TOKEN=your-token npm run dev`

### Worker Deployment

Before deploying the worker to Cloudflare, create a KV namespace for rate limiting:

```bash
cd worker
npx wrangler kv:namespace create RATE_LIMIT_KV
```

Update `worker/wrangler.toml` with the returned namespace `id`. For local dev, the worker uses simulated KV.

### GitHub Actions Deployment

Pushes to `master` trigger automatic deployment via `.github/workflows/deploy.yml`:

- **Frontend** → GitHub Pages (e.g. `https://<user>.github.io/tiles/`)
- **Worker** → Cloudflare Workers

**Required setup:**

1. **GitHub Pages**: In repo Settings → Pages, set source to **GitHub Actions**.
2. **Secrets** (Settings → Secrets and variables → Actions):
   - `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Workers edit permission
   - `CLOUDFLARE_ACCOUNT_ID` — Your Cloudflare account ID
   - `CLOUDFLARE_RATE_LIMIT_KV_ID` — KV namespace ID for rate limiting. Run `npx wrangler kv namespace create RATE_LIMIT_KV` in `worker/` and add the returned `id` as a secret.
   - `VITE_API_URL` — Deployed worker URL (e.g. `https://tiles-worker.<subdomain>.workers.dev`). Deploy the worker once manually to obtain this, then add it as a secret for subsequent runs.

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system architecture.

## Contributing

This project uses a ticket-based workflow. See [AGENTS.md](AGENTS.md) for the full workflow, or:

- `./tk ready` — see available tasks
- `./tk create "title"` — create a new ticket
- `./tk show <id>` — view ticket details

---

*Last Updated: 2026-02-23*
