---
id: til-ihbz
status: open
deps: [til-a8g5]
links: [til-wfke, til-yasw, til-l24d, til-joj6, til-442l, til-hxs3, til-a8g5, til-nahm]
created: 2026-02-24T06:57:02Z
type: task
priority: 2
assignee: John Wilkinson
---
# Diagnose shader merge failure

Start dev server with wrangler --remote, use browser automation (cursor-ide-browser MCP) to trigger a real merge, capture the raw AI response and compile errors. Reveals exactly what the AI produces and why it fails. Contingencies: if wrangler auth fails, curl production worker; if browser_evaluate can't import Vite modules, add console.log instrumentation to merge.ts.

## Acceptance Criteria

Raw AI response and compile errors captured; root cause of shader failure identified.

