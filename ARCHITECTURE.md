# System Architecture 🏛️

## Overview

**Tiles** is a mobile-optimized, drag-and-drop web application where users combine actively running WebGL shaders to iteratively generate new ones via an AI. It runs directly in the browser via GitHub Pages, with a lightweight Cloudflare Worker backend proxying the LLM requests with strict rate limits.

## Tech Stack

- **Frontend**: TypeScript, HTML/CSS (Vite for bundling)
- **WebGL Environment**: Raw WebGL or a lightweight wrapper to execute GLSL shaders across devices.
- **Backend / Proxy**: Cloudflare Workers (TypeScript)
- **Storage**: IndexedDB (for persisting shader objects and history locally)
- **Testing**: Playwright or Vitest with specific mock environments.
- **Hosting**: GitHub Pages (Frontend), Cloudflare (Worker)
- **Package Manager**: npm or pnpm

## System Components

### 1. Frontend Web App
- **UI Grid**: Displays responsive tiles containing running shaders. Mobile-first design.
- **Interactions**: Dragging a tile onto another triggers an AI merge request. Tapping a tile expands it to full screen, pushing a state to the browser history to support "Back" navigation. User-created and merged tiles can be deleted; the six built-in seed tiles (Gradient, Plasma, Noise, Circles, Stripes, Rainbow) cannot be deleted.
- **Shader Execution**: Each tile maintains a WebGL context (or shared context). A consistent GLSL API is injected (e.g., `time`, `backbuffer`, `resolution`, `touch`, `multitouch`). 
- **Compilation Retries**: If the AI returns GLSL that fails to compile, the frontend catches the error and automatically requests a retry from the LLM, passing the error as context (maximum 3 retries).
- **Test Mode Hooks**: For full-stack testing, the frontend detects a special test flag and intercepts GPU/network calls. Test stubs like `[VALID CODE]` or `[INVALID CODE]` are used to bypass actual shader compilation while validating application logic.

### 2. Cloudflare Worker Backend
- **Primary Role**: Acts as an authenticated proxy to the LLM (e.g., OpenAI/Anthropic/Gemini) to generate combined GLSL code.
- **Security**: Enforces strict CORS (only accepting requests from the GitHub Pages domain) and implements IP-based and global token rate limits to prevent abuse.

### 3. CI/CD Pipeline
- **Deployments**: Triggered automatically via GitHub Actions upon pushes to `main`. Actions will handle both the GitHub Pages Vite build and the Wrangler Cloudflare Worker deployment.

## Data Flow

1. **User Action**: User drags Tile A onto Tile B.
2. **Local Processing**: Frontend extracts GLSL source code from both tiles.
3. **API Request**: Frontend sends a POST request to the Cloudflare Worker containing both source codes.
4. **Proxy & Validation**: Worker validates CORS, IP limits, and global budgets. 
5. **LLM Generation**: Worker forwards the prompt to the AI. AI returns newly generated GLSL.
6. **Worker Response**: Worker streams or returns the code to the Frontend.
7. **Compilation & Execution**: Frontend compiles the new GLSL.
   - *Success*: The new shader is rendered in a new tile and saved to IndexedDB.
   - *Failure*: Frontend captures the compiler error and resubmits to the Worker up to 3 times before displaying a toast error to the user.

---

*Last Updated: 2026-02-24*