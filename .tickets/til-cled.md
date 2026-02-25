---
id: til-cled
status: closed
deps: []
links: []
created: 2026-02-25T02:12:03Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Worker: POST /suggest endpoint

Add a POST /suggest endpoint to worker/src/index.ts that takes { fragmentSource: string, adventurousness: 'conservative' | 'moderate' | 'wild' } and returns { suggestion: string }. Maps adventurousness to AI temperature: conservative=0.3, moderate=0.7, wild=1.2. Asks the AI for a single 1-sentence suggestion for how to modify the shader. Rate-limited via existing checkRateLimits/incrementRateLimits infrastructure.

## Design

System prompt: expert GLSL programmer, suggest one short creative modification. User prompt includes the fragment source. Use temperature parameter on env.AI.run(). Return a plain text suggestion, not GLSL code. Low token cost — short text response only.

## Acceptance Criteria

POST /suggest returns a valid JSON { suggestion: string } response. Different adventurousness values produce different temperature settings. Endpoint is rate-limited. Invalid requests return 400. CORS enforced.

