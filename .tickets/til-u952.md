---
id: til-u952
status: closed
deps: [til-ww77, til-rmo1]
links: []
created: 2026-02-24T19:54:25Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-wmtr
---
# Add ./rl cost command with Cloudflare API spend data

Add a new 'cost' subcommand to scripts/rl.ts with three sections. (1) Actual Spend from Cloudflare API (primary/canonical): query GraphQL aiInferenceAdaptiveGroups for neuron usage by model and time period, convert to dollars at $0.011/1000 neurons, subtract 10K free daily neurons. Requires CF_API_TOKEN and CF_ACCOUNT_ID env vars with graceful fallback if missing. Discovery step: run GraphQL introspection on AccountAiInferenceAdaptiveGroups to confirm available fields. (2) Estimated Spend from rate-limit counters (secondary): fetch from worker /usage endpoint, convert tracked tokens to estimated cost using API-fetched per-model pricing. Clearly labeled as estimates. If per-model pricing unavailable from API, show raw token counts and defer to section 1. (3) Max Potential Spend: using effective rate limits and API-fetched pricing, calculate max cost/hour and cost/day at worst-case output-heavy token split, with free-tier offset. All pricing fetched live from Cloudflare APIs -- never stored on disk. Consider unit tests for cost calculation logic (free tier subtraction, neuron-to-dollar math).

