---
id: til-a8g5
status: open
deps: []
links: [til-wfke, til-yasw, til-l24d, til-joj6, til-442l, til-ihbz, til-hxs3, til-nahm]
created: 2026-02-24T06:57:22Z
type: task
priority: 2
assignee: John Wilkinson
---
# Configure dev server for Workers AI

Ensure wrangler dev runs with --remote flag so the AI binding connects to Cloudflare edge. Update worker/package.json dev script or document the manual run. Needed for real AI access during development and prompt eval.

## Acceptance Criteria

npm run dev -w worker (or documented alternative) provides real AI binding.

