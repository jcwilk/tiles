#!/usr/bin/env -S npx tsx
/**
 * Probe AI endpoints to verify they respond or fail with timeout (not hang).
 * Run with worker up: npm run dev -w worker (or npm run dev from root).
 *
 * Usage:
 *   ./scripts/ai-probe.ts              # probe all AI endpoints
 *   ./scripts/ai-probe.ts suggest      # suggest only
 *   ./scripts/ai-probe.ts generate     # generate (merge) only
 *   ./scripts/ai-probe.ts apply        # apply-directive only
 *
 * Env: AI_PROBE_URL (default http://localhost:8787)
 */

const BASE = process.env.AI_PROBE_URL ?? "http://localhost:8787";
const TIMEOUT_MS = 65_000; // slightly longer than worker's 60s to test timeout path

const ORIGIN = "http://localhost:5173";

const MINIMAL_SHADER = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() { fragColor = vec4(1.0, 0.0, 0.0, 1.0); }`;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function probeHealth(): Promise<boolean> {
  const res = await fetchWithTimeout(
    `${BASE}/health`,
    { headers: { Origin: ORIGIN } },
    5_000
  );
  const ok = res.ok;
  console.log(`  /health: ${ok ? "OK" : "FAIL"}`);
  return ok;
}

async function probeSuggest(): Promise<void> {
  console.log("\nProbing POST /suggest...");
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(
      `${BASE}/suggest`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ORIGIN },
        body: JSON.stringify({
          fragmentSource: MINIMAL_SHADER,
          adventurousness: "conservative",
        }),
      },
      TIMEOUT_MS
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const data = (await res.json()) as { suggestion?: string; error?: string; details?: string };
    if (res.ok && typeof data.suggestion === "string") {
      console.log(`  OK (${elapsed}s): "${data.suggestion.slice(0, 60)}..."`);
    } else {
      console.log(`  FAIL (${elapsed}s): ${(data as { error?: string }).error ?? data.details ?? res.status}`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ERROR (${elapsed}s): ${msg}`);
    if (msg.includes("abort") || msg.includes("timeout")) {
      console.log("  (Timeout is expected if Workers AI is unavailable; prevents infinite hang)");
    }
  }
}

async function probeGenerate(): Promise<void> {
  console.log("\nProbing POST /generate (merge)...");
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(
      `${BASE}/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ORIGIN },
        body: JSON.stringify({
          fragmentA: MINIMAL_SHADER,
          fragmentB: MINIMAL_SHADER,
        }),
      },
      TIMEOUT_MS
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const data = (await res.json()) as { fragmentSource?: string; error?: string; details?: string };
    if (res.ok && typeof data.fragmentSource === "string") {
      console.log(`  OK (${elapsed}s): got ${data.fragmentSource.length} chars`);
    } else {
      console.log(`  FAIL (${elapsed}s): ${(data as { error?: string }).error ?? data.details ?? res.status}`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ERROR (${elapsed}s): ${msg}`);
  }
}

async function probeApplyDirective(): Promise<void> {
  console.log("\nProbing POST /apply-directive...");
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(
      `${BASE}/apply-directive`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: ORIGIN },
        body: JSON.stringify({
          fragmentSource: MINIMAL_SHADER,
          directive: "make it blue",
        }),
      },
      TIMEOUT_MS
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const data = (await res.json()) as { fragmentSource?: string; error?: string; details?: string };
    if (res.ok && typeof data.fragmentSource === "string") {
      console.log(`  OK (${elapsed}s): got ${data.fragmentSource.length} chars`);
    } else {
      console.log(`  FAIL (${elapsed}s): ${(data as { error?: string }).error ?? data.details ?? res.status}`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ERROR (${elapsed}s): ${msg}`);
  }
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "all";
  console.log(`AI probe → ${BASE}`);

  const ok = await probeHealth();
  if (!ok) {
    console.error("\nWorker not reachable. Start with: npm run dev -w worker");
    process.exit(1);
  }

  if (cmd === "suggest") {
    await probeSuggest();
  } else if (cmd === "generate") {
    await probeGenerate();
  } else if (cmd === "apply") {
    await probeApplyDirective();
  } else if (cmd === "all" || cmd === "help" || cmd === "-h" || cmd === "--help") {
    if (cmd !== "all") {
      console.log("Usage: ./scripts/ai-probe.ts [suggest|generate|apply|all]");
      process.exit(0);
    }
    await probeSuggest();
    await probeGenerate();
    await probeApplyDirective();
  } else {
    console.error(`Unknown: ${cmd}. Use suggest, generate, apply, or all`);
    process.exit(1);
  }

  console.log("");
}

main();
