---
description: Bootstrap AI agent tooling for a repository — audits current state, proposes missing files, and installs them with user approval.
---

# Bootstrap AI Agent Tooling

This command defines the standard for AI agent tooling in a repository and guides the agent through auditing, proposing, and installing missing pieces. It is designed to be **project-agnostic**: it works across languages, frameworks, and architectures. The only assumptions are that the project is a **git repo** and will use **Cursor** (with a mind towards IDE-agnostic core workflows) and the **Ticket** task-tracking system.

---

## The Standard

A fully bootstrapped repository contains the following files and directories. Default content is provided below for each file. **You may diverge from these defaults** when the project's reality demands it — they are starting points, not sacred templates. But preserve the structural conventions (section headings, document purposes, relationships between files) unless you have a specific reason not to.

### 1. `.cursor/rules/index.mdc` — Entry-Point Rule

The single always-applied Cursor rule. Its only job is to direct the agent to `AGENTS.md`. This file is nearly identical across all projects.

```markdown
---
description: Global project rules and entry point for all agent instructions.
globs:
alwaysApply: true
---

# Global Project Rules

Welcome, agent. This project is governed by the instructions in [AGENTS.md](../../AGENTS.md).

## Primary Mandate

**You MUST read and follow the instructions in `AGENTS.md` before proceeding with any task.**
```

### 2. `AGENTS.md` — Agent Instructions

The primary orientation document. Lives at the project root. Adapt the "Useful Commands" section to the project's actual tooling.

**Default content:**

```markdown
# Agent Instructions 🤖

Welcome, agent. You are working on the **PROJECT_NAME** project. This file serves as your primary orientation and mandate.

## Core Mandates

1.  **Task Tracking**: Use the ticket system for all work.
    - Check `./tk ready` for available tasks (open/in-progress with dependencies resolved).
    - Start a task with `./tk start <id>`.
    - Create new tickets for sub-tasks or bugs discovered.
    - Close tasks with `./tk close <id>` only after verification.
    - **Note**: `./tk list` shows all tickets; `./tk ready` shows only unblocked ones. For list/ready/blocked/closed, `-a NAME` filters by assignee and `-T TAG` filters by tag (these are filters, not the create options).
2.  **Documentation First**: Before making significant changes, consult `ARCHITECTURE.md` and `CONVENTIONS.md` in the project root.
    - For domain-specific knowledge, see `docs/README.md`.
    - Respect the "gardened" nature of the documentation.
    - Do not modify these core directive files unless specifically instructed.
3.  **IDE Agnostic**: Ensure your workflows and scripts remain portable. Do not rely on IDE-specific features for core functionality.
4.  **Security**: Never commit secrets, API keys, or sensitive data.

## Workflow

1.  **Work Next**: When picking up new work or triggered via `/work-next`:
    - Run `./tk ready` to identify the highest priority available task.
    - Run `./tk start <id>` to mark the ticket as in-progress.
    - Run `./tk show <id>` to orient yourself to the requirements and design.
2.  **Discovery**: Explore the codebase, root documentation, and `docs/` to understand the context.
3.  **Strategy**: Propose a plan before execution.
4.  **Execution**:
    - Use the `./tk` symlink (pointing to `./scripts/ticket`) for task management.
    - Follow `CONVENTIONS.md`.
5.  **Validation**: Run tests and linting before finishing.

## Useful Commands

- `./tk help`: Show ticket system help.
- `./tk ready`: Show tasks ready to be worked on.
- `./tk show <id>`: Show details of a specific ticket.

---

*Last Updated: YYYY-MM-DD*
```

Replace `PROJECT_NAME` with the actual project name and `YYYY-MM-DD` with the current date. Add project-specific commands (dev server, test runner, linter, build, deploy) to the "Useful Commands" section.

### 3. `ARCHITECTURE.md` — System Architecture

Lives at the project root. This file is the most project-specific — see the Architecture Decision Guide below for how to populate it. The structure should follow this pattern:

**Default content:**

```markdown
# System Architecture 🏛️

## Overview

One-paragraph summary: what this project is and what it does.

## Tech Stack

- **Language**: (e.g., TypeScript, Python, Rust)
- **Framework**: (e.g., Next.js, FastAPI, Axum, static HTML/CSS/JS)
- **Hosting**: (e.g., GitHub Pages, Vercel, local-only)
- **Database**: (if applicable)
- **Testing**: (framework and approach)
- **Package Manager**: (e.g., npm, pip, cargo)

## Directory Structure

(Annotated tree of the codebase — keep this accurate as the project evolves.)

## Data Flow

(How information moves through the system. For static sites this may just describe the build pipeline. For applications, describe request/response flow, data persistence, etc.)

---

*Last Updated: YYYY-MM-DD*
```

### 4. `CONVENTIONS.md` — Coding Conventions

Lives at the project root. Adapt the language-specific sections to whatever the project actually uses. The Git & Commits section is universal.

**Default content:**

```markdown
# Coding Conventions 📝

## General Principles

- Write clear, readable code. Prefer explicitness over cleverness.
- Follow existing patterns — consistency within the project trumps personal preference.
- Keep functions small and focused on a single responsibility.

## Language-Specific Rules

(Adapt this entire section to the project's language. Examples below for common stacks.)

### TypeScript / JavaScript
- Prefer strict typing. Avoid `any`.
- Use `interface` for object shapes, `type` for unions/aliases.
- Prefer functional style and immutability where practical.

### Python
- Follow PEP 8. Use type hints on all function signatures.
- Prefer f-strings for formatting.
- Use dataclasses or Pydantic models for structured data.

### Rust
- Follow standard Rust idioms (`clippy` clean).
- Prefer owned types in public APIs; borrow in internal code.
- Use `thiserror` for library errors, `anyhow` for application errors.

### HTML / CSS / JS (Static Sites)
- Semantic HTML5 elements.
- Mobile-first responsive CSS (min-width media queries).
- Minimal JavaScript — progressive enhancement over SPA patterns.

## Styling / UI

(If the project has a UI, document the approach: CSS framework, component library, design system, etc.)

## Testing

- Place tests in a `tests/` directory (or colocated, per framework convention).
- New features should include tests.
- Mock external services in tests.

## Git & Commits

- Commit messages should follow [Conventional Commits](https://www.conventionalcommits.org/).
- Example: `feat: add user authentication flow`.
- Small, atomic commits are preferred.

---

*Last Updated: YYYY-MM-DD*
```

### 5. `README.md` — Project README

Lives at the project root. This is the public-facing entry point for humans (as opposed to `AGENTS.md` for AI agents).

**Default content:**

```markdown
# PROJECT_NAME

Brief description of what this project does.

## Getting Started

### Prerequisites

- (list runtime requirements: Node.js, Python, Rust toolchain, etc.)

### Installation

(How to clone and set up the project for local development.)

### Running

(How to start/build/serve the project.)

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system architecture.

## Contributing

This project uses a ticket-based workflow. See [AGENTS.md](AGENTS.md) for the full workflow, or:

- `./tk ready` — see available tasks
- `./tk create "title"` — create a new ticket
- `./tk show <id>` — view ticket details

## License

(License information, if applicable.)

---

*Last Updated: YYYY-MM-DD*
```

### 6. `docs/README.md` — Documentation Index

```markdown
# Docs — Reference Material 📚

This directory contains domain-specific knowledge and topic-specific deep dives.

- (links to docs as they are created)

---

*Last Updated: YYYY-MM-DD*
```

### 7. `.tickets/` — Ticket Directory

Created automatically by `./tk create` but should exist as part of the standard setup.

### 8. `scripts/ticket` — Ticket System Script

The portable, self-contained bash ticket system. Same script across all projects.

Install from the canonical source at a pinned commit:

```bash
mkdir -p scripts && curl -fsSL https://raw.githubusercontent.com/wedow/ticket/b564596e6f9ee5a9bf300600b61e1c681dc26d28/ticket -o scripts/ticket && chmod +x scripts/ticket
```

### 9. `./tk` — Symlink

A convenience symlink at the project root: `./tk → scripts/ticket`.

---

## Architecture Decision Guide

Before writing `ARCHITECTURE.md`, the agent **must ask the user** about the project's nature and intended deployment. Use the following decision tree to guide the conversation. Present the options and let the user choose — do not assume.

### Key Questions to Ask

1. **What does this project do?** (Get a one-sentence summary.)
2. **How will it be deployed / used?** This determines the tech stack:

| Project Type | Stack | Hosting | Notes |
|---|---|---|---|
| Static site / content / docs | HTML + CSS + vanilla JS | GitHub Pages | Mobile-first, responsive. Default choice when in doubt. |
| Dynamic web app (serverless) | Next.js / TypeScript | Vercel | Server-side rendering, API routes, edge functions. |
| Small local utility / script | Python | Local (CLI) | Optimized for fast iteration and LLM-assisted writing. |
| Robust local application | Rust | Local (binary) | For performance-critical or long-lived tools. |

3. **Are there other constraints?** (Existing code, required integrations, team preferences, etc.)

### Default Bias

When the user is unsure or the project could go multiple ways, **lean towards GitHub Pages with a static site**. It's the simplest deployment story, requires no backend infrastructure, and works well for a wide range of projects. Only escalate to a heavier stack when there's a clear reason.

### Adapting the Defaults

Once the architecture is decided, tailor all the default file content accordingly:

- **ARCHITECTURE.md**: Fill in the real tech stack, directory structure, and data flow.
- **CONVENTIONS.md**: Keep only the language-specific section(s) that apply. Remove the others.
- **README.md**: Adjust prerequisites, installation, and running instructions to match.
- **AGENTS.md**: Add the correct dev/test/lint/build/deploy commands to "Useful Commands."

---

## Bootstrap Procedure

When the user asks to bootstrap or audit AI tooling, follow these steps **in order**. Do not skip the analysis or proposal phases.

### Phase 1: Analyze Current State

Thoroughly audit the repository for existing AI tooling. Check for:

1. **`.cursor/rules/`** — Does it exist? What rules are in it? Is there an `index.mdc`?
2. **`AGENTS.md`** — Does it exist? Does it cover core mandates, workflow, and useful commands?
3. **`ARCHITECTURE.md`** — Does it exist? Is it populated with real project information?
4. **`CONVENTIONS.md`** — Does it exist? Does it reflect the project's actual coding style?
5. **`README.md`** — Does it exist? Is it useful or just boilerplate?
6. **`docs/`** — Does the directory exist? Is there a `README.md` index?
7. **`.tickets/`** — Does the directory exist? Are there any tickets?
8. **`scripts/ticket`** — Is the ticket script present?
9. **`./tk`** — Does the symlink exist and point to the right place?
10. **Other AI/agent config** — Check for `.github/copilot-instructions.md`, `.cursorrules` (legacy), `.aider*`, or other AI tool configs that might contain useful context or need migration.

Also gather project context needed to populate the files:

- Examine `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`, `pom.xml`, or whatever dependency manifest exists to understand the tech stack.
- Look at the directory structure to understand the project layout.
- Check for existing README, test configuration, linting setup, CI config.
- Identify the language(s), framework(s), and key patterns in use.

### Phase 2: Architecture Conversation

If `ARCHITECTURE.md` does not yet exist or is empty/placeholder, **ask the user** about the project before proposing anything. Use the Architecture Decision Guide above. Do not guess the architecture — get it from the user.

If the project already has a clear architecture (existing code, framework already chosen), confirm your understanding with the user rather than asking from scratch.

### Phase 3: Present Summary and Proposal

Present a clear summary to the user with two sections:

#### Current State
For each item in the standard, report its status:
- **Present and correct** — meets the standard, no changes needed.
- **Present but incomplete** — exists but is missing content or has issues. Describe what's missing.
- **Missing** — does not exist at all.

#### Proposed Changes
For each item that is not "present and correct," describe exactly what will be created or modified:
- For **new files**: Summarize what will go in them, noting where you'll use defaults and where you'll customize.
- For **modifications**: Describe what will change and what will be preserved.
- Be specific about content — e.g., "create CONVENTIONS.md using the Python defaults, dropping the TypeScript/Rust/HTML sections."

**Ask the user for permission before proceeding.** They may want to adjust the plan, skip certain files, or provide additional context.

### Phase 4: Execute

Once the user approves (with any modifications), install the missing pieces:

1. **Create directories** first: `.cursor/rules/`, `docs/`, `.tickets/`, `scripts/`.
2. **Install `scripts/ticket`**: If the ticket script is missing, fetch it:
   ```bash
   mkdir -p scripts && curl -fsSL https://raw.githubusercontent.com/wedow/ticket/b564596e6f9ee5a9bf300600b61e1c681dc26d28/ticket -o scripts/ticket && chmod +x scripts/ticket
   ```
3. **Create the `./tk` symlink**: `ln -s scripts/ticket ./tk`.
4. **Write documentation files**: Start from the defaults above and adapt them based on the architecture conversation and project analysis. Every file should contain accurate, project-specific information — not raw template text with unfilled placeholders.
5. **Write `.cursor/rules/index.mdc`**: Use the standard template. This is the one file that is nearly identical across projects.
6. **Handle existing files carefully**: If a file already exists but needs updates, show the user what will change before modifying it. Prefer additive changes over destructive ones.

### Phase 5: Verify and Orient

After installation:

1. Verify all files exist and are correctly linked.
2. Run `./tk help` to confirm the ticket system works.
3. Create an initial ticket for any follow-up work identified during the audit (e.g., "Flesh out ARCHITECTURE.md with data flow details").
4. Give the user a brief summary of what was installed and any recommended next steps.

---

## Important Guidelines

- **Defaults are starting points, not law.** Diverge when the project demands it, but preserve the structural intent (what each file is for, how they reference each other).
- **AGENTS.md is the source of truth**, not this command. Once AGENTS.md exists, agents follow it. This command is only for the bootstrapping process itself.
- **Gardened documentation**: These files are meant to be maintained over time. Initial content should be accurate but does not need to be exhaustive. It's better to have a correct skeleton than a detailed but wrong document.
- **The ticket script is portable**: It works in any bash environment, uses only standard unix tools, and stores data as plain markdown files in `.tickets/`. It does not depend on any external service.
- **Respect what exists**: If the project already has good documentation or conventions, incorporate and build on them rather than replacing them.
- **Ask, don't assume**: Especially for architecture decisions. The agent should never commit to a tech stack without the user's input.
