#!/usr/bin/env -S npx tsx
/**
 * CI npm install script for Cursor whitelist.
 * Validates package.json deps against allowlist, runs npm ci with retries.
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = fs.existsSync(path.join(SCRIPT_DIR, "worker"))
  ? SCRIPT_DIR
  : path.join(SCRIPT_DIR, "..");

const ALLOWLIST_PATH = path.join(SCRIPT_DIR, "allowlist.json");
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 60_000;
const INITIAL_BACKOFF_MS = 2_000;

interface PackageJson {
  name?: string;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface AllowlistConfig {
  packages: string[];
}

function loadAllowlist(): string[] {
  const raw = fs.readFileSync(ALLOWLIST_PATH, "utf-8");
  const config: AllowlistConfig = JSON.parse(raw);
  if (!Array.isArray(config.packages)) {
    throw new Error("allowlist.json must have a 'packages' array");
  }
  return config.packages;
}

function extractDirectDeps(pkg: PackageJson): Set<string> {
  const deps = new Set<string>();
  for (const section of [pkg.dependencies, pkg.devDependencies]) {
    if (!section) continue;
    for (const [name, spec] of Object.entries(section)) {
      if (spec.startsWith("workspace:")) continue;
      deps.add(name);
    }
  }
  return deps;
}

function collectWorkspacePackagePaths(rootPkg: PackageJson): string[] {
  const paths: string[] = [path.join(ROOT_DIR, "package.json")];
  const workspaces = rootPkg.workspaces;
  if (!workspaces?.length) return paths;

  for (const w of workspaces) {
    const base = w.replace(/\/\*$/, "");
    const pkgPath = path.join(ROOT_DIR, base, "package.json");
    if (fs.existsSync(pkgPath)) paths.push(pkgPath);
  }
  return paths;
}

export function validateAllowlist(
  allowlist: string[],
  pkgPaths: string[]
): { valid: boolean; invalid: { name: string; from: string }[] } {
  const allowed = new Set(allowlist);
  const invalid: { name: string; from: string }[] = [];

  for (const pkgPath of pkgPaths) {
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg: PackageJson = JSON.parse(raw);
    const rel = path.relative(ROOT_DIR, pkgPath);
    const deps = extractDirectDeps(pkg);
    for (const name of deps) {
      if (!allowed.has(name)) {
        invalid.push({ name, from: rel });
      }
    }
  }

  return { valid: invalid.length === 0, invalid };
}

function runNpmCi(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("npm", ["ci"], {
      cwd: ROOT_DIR,
      stdio: "inherit",
      env: {
        ...process.env,
        npm_config_fetch_timeout: String(FETCH_TIMEOUT_MS / 1000),
        npm_config_fetch_retries: String(MAX_RETRIES),
      },
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<number> {
  const allowlist = loadAllowlist();
  const rootPkgPath = path.join(ROOT_DIR, "package.json");
  if (!fs.existsSync(rootPkgPath)) {
    console.error("Error: package.json not found at project root");
    return 1;
  }

  const rootPkg: PackageJson = JSON.parse(
    fs.readFileSync(rootPkgPath, "utf-8")
  );
  const pkgPaths = collectWorkspacePackagePaths(rootPkg);
  const { valid, invalid } = validateAllowlist(allowlist, pkgPaths);

  if (!valid) {
    console.error("Error: The following packages are not in the allowlist:");
    for (const { name, from } of invalid) {
      console.error(`  - ${name} (from ${from})`);
    }
    console.error(
      "\nAdd approved packages to scripts/allowlist.json and try again."
    );
    return 1;
  }

  let lastCode = 1;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    lastCode = await runNpmCi();
    if (lastCode === 0) return 0;
    if (attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.error(`npm ci failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${backoff}ms...`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  return lastCode;
}

if (!process.env.CI_NPM_TEST) {
  main().then((code) => process.exit(code));
}
