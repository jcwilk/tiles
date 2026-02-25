#!/usr/bin/env -S npx tsx
/**
 * Server status and management CLI for Tiles (frontend, worker)
 * Check reachability of local/remote endpoints; start, stop, restart dev servers.
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = fs.existsSync(path.join(SCRIPT_DIR, "worker"))
  ? SCRIPT_DIR
  : path.join(SCRIPT_DIR, "..");

const VITE_DEV_URL = process.env.VITE_DEV_URL ?? "http://localhost:5173";
const WORKER_DEV_URL = process.env.WORKER_DEV_URL ?? "http://localhost:8787";
const SRV_REMOTE_FRONTEND_URL = process.env.SRV_REMOTE_FRONTEND_URL ?? "";
const SRV_REMOTE_WORKER_URL =
  process.env.SRV_REMOTE_WORKER_URL ?? process.env.VITE_API_URL ?? "";
const PIDFILE =
  process.env.SRV_PIDFILE ?? path.join(ROOT_DIR, ".srv-dev.pid");

function usageHelp(): void {
  console.log(`Usage: ./srv <command> [options]

Commands:
  status       Check reachability of local or remote endpoints (default: local)
  start        Start frontend and worker in background (npm run dev)
  stop         Stop dev processes started by ./srv start
  restart      Stop then start dev processes
  help         Show this help

Examples:
  ./srv status           # local: frontend (5173), worker (8787)
  ./srv status local     # same as above
  ./srv status remote    # production endpoints (set SRV_* env vars)
  ./srv start            # bring up dev servers
  ./srv stop             # terminate dev servers
  ./srv restart          # stop then start

Environment (local):
  VITE_DEV_URL    Frontend URL (default: http://localhost:5173)
  WORKER_DEV_URL  Worker URL (default: http://localhost:8787)

Environment (remote):
  SRV_REMOTE_FRONTEND_URL  Production frontend URL (e.g. https://owner.github.io/tiles/)
  SRV_REMOTE_WORKER_URL    Production worker URL (or VITE_API_URL)`);
}

function statusHelp(): void {
  console.log(`Usage: ./srv status [local|remote]

  local   Check local dev servers: frontend (Vite :5173), worker (Wrangler :8787)
  remote  Check production endpoints (GitHub Pages, Cloudflare Worker)

  Default is local if no argument given.

  Exit 0 only if all endpoints are reachable.`);
}

export async function checkUrl(url: string, label: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    const ok = res.ok;
    console.log(`  ${label}: ${ok ? "OK" : "FAIL"}`);
    return ok;
  } catch {
    console.log(`  ${label}: FAIL`);
    return false;
  }
}

export async function cmdStatusLocal(): Promise<number> {
  console.log("=== Local status ===");
  const [frontendOk, workerOk] = await Promise.all([
    checkUrl(`${VITE_DEV_URL}/`, `frontend (${VITE_DEV_URL})`),
    checkUrl(`${WORKER_DEV_URL}/health`, `worker (${WORKER_DEV_URL})`),
  ]);
  return frontendOk && workerOk ? 0 : 1;
}

export async function cmdStatusRemote(): Promise<number> {
  if (!SRV_REMOTE_FRONTEND_URL && !SRV_REMOTE_WORKER_URL) {
    console.error("Error: set SRV_REMOTE_FRONTEND_URL and/or SRV_REMOTE_WORKER_URL for remote status");
    console.error(
      "Example: SRV_REMOTE_FRONTEND_URL=https://owner.github.io/tiles/ SRV_REMOTE_WORKER_URL=https://tiles-worker.workers.dev ./srv status remote"
    );
    return 1;
  }
  console.log("=== Remote status ===");
  let frontendOk = true;
  let workerOk = true;
  if (SRV_REMOTE_FRONTEND_URL) {
    const url = SRV_REMOTE_FRONTEND_URL.endsWith("/")
      ? SRV_REMOTE_FRONTEND_URL
      : `${SRV_REMOTE_FRONTEND_URL}/`;
    frontendOk = await checkUrl(url, `frontend (${SRV_REMOTE_FRONTEND_URL})`);
  } else {
    console.log("  frontend: (not configured)");
  }
  if (SRV_REMOTE_WORKER_URL) {
    workerOk = await checkUrl(
      `${SRV_REMOTE_WORKER_URL}/health`,
      `worker (${SRV_REMOTE_WORKER_URL})`
    );
  } else {
    console.log("  worker: (not configured)");
  }
  return frontendOk && workerOk ? 0 : 1;
}

export async function cmdStatus(target: string): Promise<number> {
  switch (target) {
    case "local":
      return cmdStatusLocal();
    case "remote":
      return cmdStatusRemote();
    case "help":
    case "--help":
    case "-h":
      statusHelp();
      return 0;
    default:
      console.error(`Unknown: status ${target}`);
      statusHelp();
      return 1;
  }
}

export function cmdStart(): number {
  if (fs.existsSync(PIDFILE)) {
    console.error("Dev servers may already be running (pidfile exists). Run './srv stop' first.");
    return 1;
  }
  console.log("Starting frontend and worker...");
  const child = spawn("npm", ["run", "dev"], {
    cwd: ROOT_DIR,
    stdio: "ignore",
    detached: true,
    env: { ...process.env },
  });
  child.unref();
  fs.writeFileSync(PIDFILE, String(child.pid));
  console.log("Started. PID file:", PIDFILE);
  console.log("Run './srv status' to verify.");
  return 0;
}

export async function cmdStop(): Promise<number> {
  if (!fs.existsSync(PIDFILE)) {
    console.error("No pidfile found. Dev servers may not have been started by ./srv.");
    return 1;
  }
  const pid = parseInt(fs.readFileSync(PIDFILE, "utf8"), 10);
  fs.unlinkSync(PIDFILE);
  try {
    process.kill(pid, 0);
  } catch {
    console.log("Process", pid, "not running. Stopped.");
    return 0;
  }
  // Kill process group (child + descendants). On Unix, negative PID = process group.
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch {
      console.log("Stopped dev servers.");
      return 0;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* ignore */
    }
  }
  console.log("Stopped dev servers.");
  return 0;
}

export async function cmdRestart(): Promise<number> {
  if (fs.existsSync(PIDFILE)) {
    await cmdStop();
  }
  return cmdStart();
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "help";
  const arg = process.argv[3] ?? "local";

  let code: number;
  switch (cmd) {
    case "status":
      code = await cmdStatus(arg);
      break;
    case "start":
      code = cmdStart();
      break;
    case "stop":
      code = await cmdStop();
      break;
    case "restart":
      code = await cmdRestart();
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

// Only run main when executed directly (not when imported for tests)
if (!process.env.SRV_TEST) {
  main();
}
