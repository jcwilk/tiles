/**
 * Unit tests for ci-npm allowlist validation.
 */

process.env.CI_NPM_TEST = "1";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "path";
import { fileURLToPath } from "node:url";

const mockReadFileSync = vi.fn();
vi.mock("fs", () => ({
  readFileSync: (p: string) => mockReadFileSync(p),
  existsSync: vi.fn(() => true),
}));

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(SCRIPT_DIR, "..");

// Import after mock so ci-npm gets mocked fs
const { validateAllowlist } = await import("./ci-npm");

describe("validateAllowlist", () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes when all deps are in allowlist", () => {
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.endsWith("package.json")) {
        return JSON.stringify({
          dependencies: { foo: "^1.0.0" },
          devDependencies: { bar: "^2.0.0", baz: "~3.0.0" },
        });
      }
      throw new Error(`Unexpected read: ${p}`);
    });

    const pkgPaths = [path.join(ROOT, "package.json")];
    const { valid, invalid } = validateAllowlist(["foo", "bar", "baz"], pkgPaths);

    expect(valid).toBe(true);
    expect(invalid).toHaveLength(0);
  });

  it("fails with clear invalid list when deps are not in allowlist", () => {
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.endsWith("package.json")) {
        return JSON.stringify({
          dependencies: { foo: "^1.0.0", evil: "1.0.0" },
          devDependencies: { bar: "^2.0.0" },
        });
      }
      throw new Error(`Unexpected read: ${p}`);
    });

    const pkgPaths = [path.join(ROOT, "package.json")];
    const { valid, invalid } = validateAllowlist(["foo"], pkgPaths);

    expect(valid).toBe(false);
    expect(invalid).toHaveLength(2);
    expect(invalid.map((i) => i.name).sort()).toEqual(["bar", "evil"]);
    expect(invalid.every((i) => i.from.length > 0)).toBe(true);
  });

  it("skips workspace: protocol deps", () => {
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.endsWith("package.json")) {
        return JSON.stringify({
          dependencies: {
            foo: "^1.0.0",
            "@tiles/worker": "workspace:*",
          },
        });
      }
      throw new Error(`Unexpected read: ${p}`);
    });

    const pkgPaths = [path.join(ROOT, "package.json")];
    const { valid, invalid } = validateAllowlist(["foo"], pkgPaths);

    expect(valid).toBe(true);
    expect(invalid).toHaveLength(0);
  });

  it("validates multiple workspace package.json files", () => {
    mockReadFileSync.mockImplementation((p: string) => {
      if (p.includes("frontend") && p.endsWith("package.json")) {
        return JSON.stringify({
          devDependencies: { allowed: "^1.0.0", unapproved: "1.0.0" },
        });
      }
      if (p.includes("worker") && p.endsWith("package.json")) {
        return JSON.stringify({
          dependencies: { allowed: "^1.0.0" },
        });
      }
      throw new Error(`Unexpected read: ${p}`);
    });

    const pkgPaths = [
      path.join(ROOT, "frontend", "package.json"),
      path.join(ROOT, "worker", "package.json"),
    ];
    const { valid, invalid } = validateAllowlist(["allowed"], pkgPaths);

    expect(valid).toBe(false);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].name).toBe("unapproved");
    expect(invalid[0].from).toContain("frontend");
  });
});
