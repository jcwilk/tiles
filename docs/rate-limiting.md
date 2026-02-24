# Rate Limiting & Cloudflare Security Constraints

Tiles enforces 3-tier token rate limits (IP/hour, global/hour, global/day) via Cloudflare KV. The `./rl` CLI (TypeScript) manages usage, limits, alerts, and cost.

## Rate Limits

- **IP per hour**: Default 10,000 tokens per IP
- **Global per hour**: Default 100,000 tokens
- **Global per day**: Default 500,000 tokens

Limits are configurable via KV (`config:limits`) or env vars (`IP_PER_HOUR`, `GLOBAL_PER_HOUR`, `GLOBAL_PER_DAY`).

## ./rl Commands

| Command | Purpose |
|---------|---------|
| `./rl usage` | Show hour/day token usage from worker `GET /usage` |
| `./rl usage --ip <addr>` | Include IP-specific hour usage from KV |
| `./rl limits show` | Show current KV overrides |
| `./rl limits set '<json>'` | Set limits in KV |
| `./rl alerts show/set/enable/disable` | Configure threshold email alerts |
| `./rl cost` | Actual spend (Cloudflare API), estimated (from /usage), max potential |

## Cost Monitoring

`./rl cost` shows three sections:

1. **Actual Spend** — From Cloudflare GraphQL API. Requires `CF_API_TOKEN` and `CF_ACCOUNT_ID`. Converts neuron usage to dollars at $0.011/1,000 neurons, minus 10K free daily neurons.

2. **Estimated Spend** — From worker `/usage` counters. Converts tracked tokens to estimated cost using per-model neuron rates. Clearly labeled as estimates.

3. **Max Potential Spend** — Worst-case cost at current rate limits (output-heavy token split), with free-tier offset.

All pricing is fetched live from Cloudflare APIs; nothing is stored on disk.

## Security

- CORS restricts requests to GitHub Pages and localhost.
- Worker validates origin before processing.
- Rate limits prevent abuse; alerts notify when thresholds are exceeded.
