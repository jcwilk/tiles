---
id: wor-1nrd
status: closed
deps: [wor-1rno]
links: []
created: 2026-02-27T02:34:40Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-mqkc
---
# Remove legacy vanilla TS UI code

After the React migration is complete and tested, remove all legacy imperative DOM code that has been replaced. Files to delete or gut: (1) main.ts — replaced by main.tsx and App component. (2) tile.ts — replaced by Tile React component. (3) edit-view.ts — replaced by EditView React component. (4) viewport-observer.ts — replaced by useVisibility hook. (5) toast.ts — replaced by Toast React component. (6) click-utils.ts — no longer needed. (7) add-from-prompt.ts — logic moved to useGenerateFromPrompt hook. (8) apply-directive.ts — logic moved to useApplyDirective hook. (9) suggest.ts — logic moved to useFetchSuggestions hook. (10) context-tracker.ts — already unused. (11) styles.css — replaced by CSS modules. Keep: shader-engine.ts, webgl-context-pool.ts, validation-context.ts, storage.ts, seed.ts, seed-shaders.ts, api.ts, env.ts, builtin.ts, types.ts. Update any imports. Ensure build and all tests still pass.

## Acceptance Criteria

All listed legacy files are removed. No dead imports remain. TypeScript compiles without errors. Vite builds successfully. All React tests pass. The application works identically to pre-cleanup.

