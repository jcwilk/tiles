#!/usr/bin/env -S npx tsx
/**
 * Rate limit monitoring CLI: usage, limits, alerts
 * Uses wrangler KV and GET /usage from the worker.
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = fs.existsSync(path.join(SCRIPT_DIR, "worker"))
  ? SCRIPT_DIR
  : path.join(SCRIPT_DIR, "..");
const WORKER_DIR = path.join(ROOT_DIR, "worker");
const WRANGLER_CONFIG = path.join(WORKER_DIR, "wrangler.toml");
const KV_BINDING = "RATE_LIMIT_KV";
const API_URL = process.env.RATE_LIMIT_API_URL ?? "http://localhost:8787";

function wrangler(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync("npx", ["wrangler", ...args, "--config", WRANGLER_CONFIG, "--preview"], {
    encoding: "utf8",
    cwd: ROOT_DIR,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status,
  };
}

/** Get KV value; treats "Value not found" (wrangler stdout) as empty. */
function kvGet(key: string): string | null {
  const { stdout } = wrangler([
    "kv",
    "key",
    "get",
    key,
    "--binding",
    KV_BINDING,
    "--text",
  ]);
  const out = stdout.trim();
  if (out === "" || out.includes("Value not found")) {
    return null;
  }
  return out;
}

function kvPut(key: string, value: string): void {
  const { stderr, stdout, status } = wrangler(["kv", "key", "put", key, value, "--binding", KV_BINDING]);
  if (status !== 0) {
    console.error(stderr || stdout || "wrangler kv put failed");
    process.exit(1);
  }
}

function kvDelete(key: string): void {
  const { stderr, stdout, status } = wrangler(["kv", "key", "delete", key, "--binding", KV_BINDING]);
  if (status !== 0) {
    console.error(stderr || stdout || "wrangler kv delete failed");
    process.exit(1);
  }
}

function usageHelp(): void {
  console.log(`Usage: ./rl <command> [options]

Commands:
  usage     Show token usage (hour, day, optionally by IP)
  limits    Show or set rate limit overrides (config:limits)
  alerts    Show or configure threshold alerts (config:alerts)
  cost      Show actual spend (Cloudflare API), estimated (from /usage), and max potential
  help      Show this help

Examples:
  ./rl usage              # hour + day from GET /usage
  ./rl usage --ip 1.2.3.4 # include IP-specific hour usage from KV
  ./rl limits show        # show current limits
  ./rl limits set '{"ipPerHour":20000}'  # set KV overrides
  ./rl alerts show        # show alert config
  ./rl alerts set '{"email":"admin@example.com","thresholdPercent":80}'
  ./rl alerts enable      # enable alerts (ensure config:alerts exists)
  ./rl alerts disable     # remove config:alerts
  ./rl cost               # spend and cost estimates

Environment:
  RATE_LIMIT_API_URL  Base URL for worker (default: http://localhost:8787)
  CLOUDFLARE_API_TOKEN   Cloudflare API token (for cost actual spend)
  CLOUDFLARE_ACCOUNT_ID  Cloudflare account ID (for cost actual spend)`);
}

function usageUsageHelp(): void {
  console.log(`Usage: ./rl usage [options]

Options:
  --hour        Show hour usage (default: on)
  --day         Show day usage (default: on)
  --ip <addr>   Include IP-specific hour usage from KV

Examples:
  ./rl usage                    # hour + day from GET /usage
  ./rl usage --ip 1.2.3.4       # include IP-specific hour usage`);
}

function limitsHelp(): void {
  console.log(`Usage: ./rl limits <subcommand>

Subcommands:
  show   Show current KV overrides (config:limits)
  set    Set limits: ./rl limits set '<json>'

Examples:
  ./rl limits set '{"ipPerHour":20000,"globalPerHour":150000}'`);
}

function alertsHelp(): void {
  console.log(`Usage: ./rl alerts <subcommand>

Subcommands:
  show     Show alert config (config:alerts)
  set      Set config: ./rl alerts set '<json>'
  enable   Enable with default config
  disable  Remove config:alerts

Examples:
  ./rl alerts set '{"email":"admin@example.com","thresholdPercent":80}'`);
}

function costHelp(): void {
  console.log(`Usage: ./rl cost

Shows three sections:
  (1) Actual Spend   From Cloudflare GraphQL API (requires CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
  (2) Estimated      From worker /usage tokens, converted via model pricing
  (3) Max Potential   Worst-case cost at current rate limits`);
}

/** Neurons per 1M tokens: [input, output]. From Workers AI pricing. */
const TEXT_MODEL_NEURONS: Record<string, [number, number]> = {
  "@cf/meta/llama-3.1-8b-instruct-awq": [11161, 24215],
  "@cf/meta/llama-3.1-8b-instruct": [25608, 75147],
  "@cf/openai/whisper": [41.14, 41.14], // per audio minute, not tokens; use as placeholder
};

const NEURONS_PER_DOLLAR = 1000 / 0.011;
const FREE_NEURONS_PER_DAY = 10_000;

/** Estimate neurons from tokens (output-heavy split ~30% input, 70% output). */
function tokensToNeurons(tokens: number, modelId: string): number {
  const rates = TEXT_MODEL_NEURONS[modelId] ?? [15000, 30000];
  const [inRate, outRate] = rates;
  const inputTokens = Math.floor(tokens * 0.3);
  const outputTokens = tokens - inputTokens;
  return (inputTokens / 1e6) * inRate + (outputTokens / 1e6) * outRate;
}

/** Cost in dollars for neurons above free tier. */
function neuronsToCost(neurons: number): number {
  const billable = Math.max(0, neurons - FREE_NEURONS_PER_DAY);
  return billable / NEURONS_PER_DOLLAR;
}

export async function cmdCost(args: string[]): Promise<number> {
  if (args.includes("--help") || args.includes("-h")) {
    costHelp();
    return 0;
  }
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  // Load model config for pricing
  let textModelId = "@cf/meta/llama-3.1-8b-instruct-awq";
  try {
    const modelsPath = path.join(WORKER_DIR, "models.json");
    const models = JSON.parse(fs.readFileSync(modelsPath, "utf8")) as {
      text?: { id?: string };
    };
    if (models.text?.id) textModelId = models.text.id;
  } catch {
    /* use default */
  }

  // --- Section 1: Actual Spend from Cloudflare API ---
  console.log("=== (1) Actual Spend (Cloudflare API) ===");
  if (!cfToken || !cfAccountId) {
    console.log(
      "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to view actual spend from Cloudflare GraphQL API."
    );
  } else {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const query = `
        query($accountTag: string!, $filter: AccountAiInferenceAdaptiveGroupsFilter_InputObject) {
          viewer {
            accounts(filter: { accountTag: $accountTag }) {
              aiInferenceAdaptiveGroups(limit: 100, filter: $filter) {
                sum { neurons }
                dimensions { modelId }
              }
            }
          }
        }
      `;
      const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfToken}`,
        },
        body: JSON.stringify({
          query,
          variables: {
            accountTag: cfAccountId,
            filter: {
              date: { start: today, end: today },
            },
          },
        }),
      });
      const data = (await res.json()) as {
        data?: {
          viewer?: {
            accounts?: Array<{
              aiInferenceAdaptiveGroups?: Array<{
                sum?: { neurons?: number };
                dimensions?: { modelId?: string };
              }>;
            }>;
          };
        };
        errors?: Array<{ message?: string }>;
      };
      if (data.errors?.length) {
        console.log("GraphQL error:", data.errors[0]?.message ?? "Unknown");
      } else {
        const accounts = data.data?.viewer?.accounts ?? [];
        const groups = accounts[0]?.aiInferenceAdaptiveGroups ?? [];
        if (groups.length === 0) {
          console.log("No neuron data in response (schema may differ or no usage today).");
        } else {
          let totalNeurons = 0;
          for (const g of groups) {
            const n = g.sum?.neurons ?? 0;
            totalNeurons += n;
            const modelId = g.dimensions?.modelId ?? "unknown";
            const cost = neuronsToCost(n);
            console.log(`  ${modelId}: ${n.toLocaleString()} neurons (~$${cost.toFixed(4)})`);
          }
          const totalCost = neuronsToCost(totalNeurons);
          console.log(`  Total: ${totalNeurons.toLocaleString()} neurons (~$${totalCost.toFixed(4)})`);
        }
      }
    } catch (err) {
      console.log("Could not fetch from Cloudflare API:", err instanceof Error ? err.message : String(err));
    }
  }

  // --- Section 2: Estimated Spend from /usage ---
  console.log("\n=== (2) Estimated Spend (from rate-limit counters) ===");
  try {
    const res = await fetch(`${API_URL}/usage`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const usage = (await res.json()) as UsageResponse;
    const dayTokens = usage.day.globalTokens;
    const hourTokens = usage.hour.globalTokens;
    const dayNeurons = tokensToNeurons(dayTokens, textModelId);
    const hourNeurons = tokensToNeurons(hourTokens, textModelId);
    const dayCost = neuronsToCost(dayNeurons);
    const hourCost = neuronsToCost(hourNeurons);
    console.log(`  Day  (${usage.day.key}): ${dayTokens.toLocaleString()} tokens → ~${Math.round(dayNeurons).toLocaleString()} neurons (~$${dayCost.toFixed(4)})`);
    console.log(`  Hour (${usage.hour.key}): ${hourTokens.toLocaleString()} tokens → ~${Math.round(hourNeurons).toLocaleString()} neurons (~$${hourCost.toFixed(4)})`);
    console.log("  (Estimates; model:", textModelId, ")");
  } catch (err) {
    console.log("  Could not fetch /usage (is the worker running?):", err instanceof Error ? err.message : String(err));
  }

  // --- Section 3: Max Potential Spend ---
  console.log("\n=== (3) Max Potential Spend ===");
  try {
    const res = await fetch(`${API_URL}/usage`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const usage = (await res.json()) as UsageResponse;
    const { limits } = usage;
    const hourNeurons = tokensToNeurons(limits.globalPerHour, textModelId);
    const dayNeurons = tokensToNeurons(limits.globalPerDay, textModelId);
    const hourCost = neuronsToCost(hourNeurons);
    const dayCost = neuronsToCost(dayNeurons);
    console.log(`  At limits (worst-case output-heavy):`);
    console.log(`  Max/hour: ${limits.globalPerHour.toLocaleString()} tokens → ~$${hourCost.toFixed(4)}`);
    console.log(`  Max/day:  ${limits.globalPerDay.toLocaleString()} tokens → ~$${dayCost.toFixed(4)}`);
    console.log(`  (Free tier: ${FREE_NEURONS_PER_DAY.toLocaleString()} neurons/day)`);
  } catch (err) {
    console.log("  Could not compute (worker /usage unavailable):", err instanceof Error ? err.message : String(err));
  }

  return 0;
}

interface UsageResponse {
  hour: { key: string; globalTokens: number; limit: number };
  day: { key: string; globalTokens: number; limit: number };
  limits: { ipPerHour: number; globalPerHour: number; globalPerDay: number };
}

export async function cmdUsage(args: string[]): Promise<number> {
  let showHour = true;
  let showDay = true;
  let showIp: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--hour":
        showHour = true;
        break;
      case "--day":
        showDay = true;
        break;
      case "--ip":
        showIp = args[i + 1] ?? null;
        if (showIp) i++;
        break;
      case "--help":
      case "-h":
        usageUsageHelp();
        return 0;
      default:
        console.error(`Unknown option: ${args[i]}`);
        usageUsageHelp();
        return 1;
    }
  }

  let json: UsageResponse;
  try {
    const res = await fetch(`${API_URL}/usage`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = (await res.json()) as UsageResponse;
  } catch (err) {
    console.error(`Error: could not fetch ${API_URL}/usage (is the worker running?)`);
    return 1;
  }

  const { hour, day, limits } = json;
  console.log("=== Usage ===");
  if (showHour) {
    console.log(`Hour (${hour.key}): ${hour.globalTokens} / ${hour.limit} tokens`);
  }
  if (showDay) {
    console.log(`Day  (${day.key}): ${day.globalTokens} / ${day.limit} tokens`);
  }

  if (showIp) {
    const hourIso = new Date().toISOString().slice(0, 13);
    const ipVal = kvGet(`ip:${showIp}:${hourIso}`) ?? "0";
    console.log(`IP ${showIp} (${hourIso}): ${ipVal} tokens`);
  }

  console.log("");
  console.log("=== Limits ===");
  console.log(
    `ipPerHour: ${limits.ipPerHour}, globalPerHour: ${limits.globalPerHour}, globalPerDay: ${limits.globalPerDay}`
  );
  return 0;
}

export function cmdLimits(args: string[]): number {
  const sub = args[0] ?? "show";
  const rest = args.slice(1);

  switch (sub) {
    case "help":
    case "--help":
    case "-h":
      limitsHelp();
      return 0;
    case "show": {
      const raw = kvGet("config:limits");
      if (!raw) {
        console.log("No KV overrides (using env/defaults). Run './rl limits set {...}' to set.");
      } else {
        try {
          console.log(JSON.stringify(JSON.parse(raw), null, 2));
        } catch {
          console.log(raw);
        }
      }
      return 0;
    }
    case "set": {
      const payload = rest[0];
      if (!payload) {
        console.error("Usage: ./rl limits set '<json>'");
        console.error('Example: ./rl limits set \'{"ipPerHour":20000,"globalPerHour":150000}\'');
        return 1;
      }
      try {
        JSON.parse(payload);
      } catch {
        console.error("Error: invalid JSON");
        return 1;
      }
      kvPut("config:limits", payload);
      console.log("Updated config:limits");
      return 0;
    }
    default:
      console.error(`Unknown: limits ${sub}`);
      limitsHelp();
      return 1;
  }
}

export function cmdAlerts(args: string[]): number {
  const sub = args[0] ?? "show";
  const rest = args.slice(1);

  switch (sub) {
    case "help":
    case "--help":
    case "-h":
      alertsHelp();
      return 0;
    case "show": {
      const raw = kvGet("config:alerts");
      if (!raw) {
        console.log("Alerts not configured. Run './rl alerts set {...}' or './rl alerts enable'.");
      } else {
        try {
          console.log(JSON.stringify(JSON.parse(raw), null, 2));
        } catch {
          console.log(raw);
        }
      }
      return 0;
    }
    case "set": {
      const payload = rest[0];
      if (!payload) {
        console.error("Usage: ./rl alerts set '<json>'");
        console.error(
          'Example: ./rl alerts set \'{"email":"admin@example.com","thresholdPercent":80,"alertHour":true,"alertDay":true}\''
        );
        return 1;
      }
      try {
        JSON.parse(payload);
      } catch {
        console.error("Error: invalid JSON");
        return 1;
      }
      kvPut("config:alerts", payload);
      console.log("Updated config:alerts");
      return 0;
    }
    case "enable": {
      const raw = kvGet("config:alerts");
      if (raw) {
        console.log("Alerts already configured:");
        try {
          console.log(JSON.stringify(JSON.parse(raw), null, 2));
        } catch {
          console.log(raw);
        }
      } else {
        const defaultConfig =
          '{"email":"alerts@example.com","thresholdPercent":80,"alertHour":true,"alertDay":true}';
        kvPut("config:alerts", defaultConfig);
        console.log("Enabled alerts with default config. Run './rl alerts set {...}' to customize.");
      }
      return 0;
    }
    case "disable":
      kvDelete("config:alerts");
      console.log("Alerts disabled (config:alerts removed)");
      return 0;
    default:
      console.error(`Unknown: alerts ${sub}`);
      alertsHelp();
      return 1;
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "help";
  const args = process.argv.slice(3);

  let code: number;
  switch (cmd) {
    case "usage":
      code = await cmdUsage(args);
      break;
    case "limits":
      code = cmdLimits(args);
      break;
    case "alerts":
      code = cmdAlerts(args);
      break;
    case "cost":
      code = await cmdCost(args);
      break;
    case "help":
    case "--help":
    case "-h":
      usageHelp();
      code = 0;
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      usageHelp();
      code = 1;
  }
  process.exit(code);
}

if (!process.env.RL_TEST) {
  main();
}
