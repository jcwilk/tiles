# Coding Conventions 📝

## General Principles

- Write clear, readable code. Prefer explicitness over cleverness.
- Follow existing patterns — consistency within the project trumps personal preference.
- Keep functions small and focused on a single responsibility.
- Support robust testing by designing code that can run completely offline with mocked endpoints and stubs.

## TypeScript / JavaScript

- Prefer strict typing. Avoid `any`. Use `unknown` if the shape is truly undefined.
- Use `interface` for object shapes, `type` for unions/aliases.
- Prefer functional style and immutability where practical.
- Keep the Cloudflare Worker isolated in its own sub-directory/workspace.

## HTML / CSS / UI

- Semantic HTML5 elements where appropriate.
- Mobile-first responsive CSS (min-width media queries). The layout must elegantly handle multiple shaders per row depending on viewport width.
- Use native browser APIs when possible (e.g., Drag and Drop API, Pointer Events for multi-touch, History API for full-screen navigation).

## WebGL / GLSL API

- Create a strict, standardized API for shaders that the LLM understands and can reliably target.
- Required uniforms/inputs:
    - Time tracking (`float time` or `u_time`).
    - Backbuffer (`sampler2D backbuffer`) utilizing ping-pong framebuffers.
    - Touch input (`vec2 touch` or an array for multi-touch).
    - Resolution (`vec2 resolution`).

## Testing & Configuration

- **Test Modes**: Do not execute real GLSL compilation during automated tests. Instead, look for placeholder strings like `[VALID CODE]` to mock success or `[INVALID CODE]` to test retry loops and error toasts.
- **Environment Configuration**: Code must gracefully switch between local Dev environments (local Vite + local Wrangler) and Production (GitHub Pages + Cloudflare) via environment variables.

## Git & Commits

- Commit messages should follow [Conventional Commits](https://www.conventionalcommits.org/).
- Example: `feat: add backbuffer ping-pong to webgl pipeline`.
- Small, atomic commits are preferred.

---

*Last Updated: 2026-02-23*