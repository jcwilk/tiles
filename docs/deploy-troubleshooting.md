# Cloudflare Worker Deploy Troubleshooting

Reference for diagnosing deploy failures (til-4d0s, til-b0gp).

## Common failure causes

### 1. Future compatibility_date (Code: 10021)

Cloudflare rejects `compatibility_date` values in the future. Error: *"Can't set compatibility date in the future"*.

**Fix**: Set `compatibility_date` in `worker/wrangler.toml` to the current date (YYYY-MM-DD).

### 2. KV namespace injection mismatch

The deploy workflow (`.github/workflows/deploy.yml`) injects `CLOUDFLARE_RATE_LIMIT_KV_ID` by replacing the placeholder `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` in `worker/wrangler.toml`. If the placeholder was removed or changed, CI deploys use the wrong (or non-existent) KV namespace.

**Fix**: Ensure `worker/wrangler.toml` has the placeholder for production `id`; CI replaces it with the secret. For manual deploy, replace the placeholder with your KV namespace id from `npx wrangler kv namespace create RATE_LIMIT_KV`.

### 3. send_email binding prerequisites

The `ALERT_EMAIL` binding requires [Email Routing](https://developers.cloudflare.com/email-routing/get-started/) enabled and at least one verified destination address. If not configured, deploy may fail.

**Fix**: The binding is commented out in `worker/wrangler.toml` by default so deploys succeed without Email Routing. To enable rate-limit alerts, uncomment the `[[send_email]]` block and configure Email Routing in your Cloudflare account.

### 4. Other known issues

- **Stale API token**: Create a new token at Cloudflare Dashboard if the build token was deleted or rolled.
- **Incorrect account_id**: Ensure `CLOUDFLARE_ACCOUNT_ID` secret matches the account.
- **Worker name mismatch**: When using Cloudflare Git integration, the Worker name on the dashboard must match `name` in wrangler.toml.

## Verification

Run a dry-run deploy locally:

```bash
cd worker
npx wrangler deploy --dry-run
```

This validates the build and bindings without uploading.
