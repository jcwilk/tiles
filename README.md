# Tiles

An experimental web application where users combine actively running WebGL shaders via an intuitive drag-and-drop interface, leveraging AI to generate new combined visual experiences.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm
- Cloudflare Wrangler CLI (for backend development)

### Installation

*(Project is currently being bootstrapped. Specific installation commands will go here once the monorepo structure is finalized.)*

```bash
git clone <repository-url>
cd tiles
npm install
```

### Running

To run the application locally (both frontend and the worker proxy):

```bash
# Start local development server and proxy
npm run dev
```

### Testing

The testing suite relies on placeholder data to avoid expensive GPU/Network operations in CI.

```bash
npm test
```

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system architecture, tech stack, and data flow.

## Contributing

This project uses a ticket-based workflow. See [AGENTS.md](AGENTS.md) for the full workflow, or:

- `./tk ready` — see available tasks
- `./tk create "title"` — create a new ticket
- `./tk show <id>` — view ticket details

---

*Last Updated: 2026-02-23*