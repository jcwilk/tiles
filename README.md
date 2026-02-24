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

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system architecture.

## Contributing

This project uses a ticket-based workflow. See [AGENTS.md](AGENTS.md) for the full workflow, or:

- `./tk ready` — see available tasks
- `./tk create "title"` — create a new ticket
- `./tk show <id>` — view ticket details

---

*Last Updated: 2026-02-23*
