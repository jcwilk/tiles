---
id: wor-bstc
status: closed
deps: [wor-yc6s]
links: []
created: 2026-02-27T02:31:25Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# React project setup and Vite configuration

Add React and React DOM as dependencies. Install @types/react and @types/react-dom. Update the Vite config to handle JSX/TSX (add @vitejs/plugin-react). Update tsconfig.json with jsx: react-jsx. Add React Testing Library deps (react-testing-library, jest-dom). Create a new entry point (main.tsx) that renders a root React component. Ensure the existing Vite dev server and build pipeline still work. Keep the old main.ts temporarily so nothing breaks until components are migrated.

## Acceptance Criteria

npm install succeeds with React deps. Vite builds successfully with TSX support. A minimal React root component renders in the browser. TypeScript compiles without errors. Existing tests still pass.

