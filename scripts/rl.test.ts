/**
 * Tests for rl CLI (rate limit monitoring).
 * Mocks fetch and spawnSync to avoid real network/KV ops.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

process.env.RL_TEST = "1";

const mockSpawnSync = vi.hoisted(() =>
  vi.fn(() => ({
    stdout: "",
    stderr: "",
    status: 0,
  }))
);

vi.mock("child_process", () => ({
  spawnSync: (...args: unknown[]) => mockSpawnSync(...args),
}));

async function loadRl(env: Record<string, string> = {}) {
  vi.resetModules();
  const orig: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) orig[k] = process.env[k];
  Object.assign(process.env, { RATE_LIMIT_API_URL: "http://localhost:8787", ...env });
  const mod = await import("./rl");
  for (const k of Object.keys(env)) {
    if (orig[k] !== undefined) process.env[k] = orig[k];
    else delete process.env[k];
  }
  return mod;
}

describe("rl cmdUsage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/usage")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                hour: { key: "2025-02-25T12", globalTokens: 100, limit: 10000 },
                day: { key: "2025-02-25", globalTokens: 500, limit: 50000 },
                limits: { ipPerHour: 5000, globalPerHour: 10000, globalPerDay: 50000 },
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false, status: 404 } as Response);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usage --help returns 0", async () => {
    const { cmdUsage } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdUsage(["--help"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Usage: ./rl usage"));
    consoleSpy.mockRestore();
  });

  it("usage fetches /usage and prints hour/day", async () => {
    const { cmdUsage } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdUsage([]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("100 / 10000"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("500 / 50000"));
    consoleSpy.mockRestore();
  });

  it("usage --ip calls kvGet and prints IP usage", async () => {
    mockSpawnSync.mockReturnValueOnce({
      stdout: "42",
      stderr: "",
      status: 0,
    });
    const { cmdUsage } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdUsage(["--ip", "1.2.3.4"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/IP 1\.2\.3\.4.*42/));
    consoleSpy.mockRestore();
  });

  it("usage returns 1 when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network error"))));
    const { cmdUsage } = await loadRl();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await cmdUsage([]);
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("could not fetch"));
    errSpy.mockRestore();
  });
});

describe("rl cmdLimits", () => {
  beforeEach(() => {
    mockSpawnSync.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("limits help returns 0", async () => {
    const { cmdLimits } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdLimits(["--help"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("limits"));
    consoleSpy.mockRestore();
  });

  it("limits show returns empty when KV has no overrides", async () => {
    mockSpawnSync.mockReturnValue({ stdout: "Value not found", stderr: "", status: 0 });
    const { cmdLimits } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdLimits(["show"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No KV overrides"));
    consoleSpy.mockRestore();
  });

  it("limits show prints JSON when KV has value", async () => {
    mockSpawnSync.mockReturnValue({
      stdout: '{"ipPerHour":20000}',
      stderr: "",
      status: 0,
    });
    const { cmdLimits } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdLimits(["show"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("ipPerHour"));
    consoleSpy.mockRestore();
  });

  it("limits set with invalid JSON returns 1", async () => {
    const { cmdLimits } = await loadRl();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = cmdLimits(["set", "not-json"]);
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("invalid JSON"));
    errSpy.mockRestore();
  });

  it("limits set with valid JSON calls wrangler and returns 0", async () => {
    mockSpawnSync.mockReturnValue({ stdout: "", stderr: "", status: 0 });
    const { cmdLimits } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdLimits(["set", '{"ipPerHour":20000}']);
    expect(code).toBe(0);
    expect(mockSpawnSync).toHaveBeenCalledWith(
      "npx",
      expect.arrayContaining(["kv", "key", "put", "config:limits", '{"ipPerHour":20000}']),
      expect.any(Object)
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Updated"));
    consoleSpy.mockRestore();
  });
});

describe("rl cmdAlerts", () => {
  beforeEach(() => {
    mockSpawnSync.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("alerts help returns 0", async () => {
    const { cmdAlerts } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdAlerts(["--help"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("alerts"));
    consoleSpy.mockRestore();
  });

  it("alerts show returns empty when not configured", async () => {
    mockSpawnSync.mockReturnValue({ stdout: "Value not found", stderr: "", status: 0 });
    const { cmdAlerts } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdAlerts(["show"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("not configured"));
    consoleSpy.mockRestore();
  });

  it("alerts set with invalid JSON returns 1", async () => {
    const { cmdAlerts } = await loadRl();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = cmdAlerts(["set", "bad"]);
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("invalid JSON"));
    errSpy.mockRestore();
  });

  it("alerts enable creates default config when none exists", async () => {
    mockSpawnSync
      .mockReturnValueOnce({ stdout: "Value not found", stderr: "", status: 0 })
      .mockReturnValueOnce({ stdout: "", stderr: "", status: 0 });
    const { cmdAlerts } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdAlerts(["enable"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Enabled alerts"));
    consoleSpy.mockRestore();
  });

  it("alerts disable deletes config", async () => {
    mockSpawnSync.mockReturnValue({ stdout: "", stderr: "", status: 0 });
    const { cmdAlerts } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdAlerts(["disable"]);
    expect(code).toBe(0);
    expect(mockSpawnSync).toHaveBeenCalledWith(
      "npx",
      expect.arrayContaining(["kv", "key", "delete", "config:alerts"]),
      expect.any(Object)
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("disabled"));
    consoleSpy.mockRestore();
  });
});

describe("rl cmdCost", () => {
  beforeEach(() => {
    mockSpawnSync.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/usage")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                hour: { key: "h", globalTokens: 100, limit: 10000 },
                day: { key: "d", globalTokens: 500, limit: 50000 },
                limits: { ipPerHour: 5000, globalPerHour: 10000, globalPerDay: 50000 },
              }),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cost --help returns 0", async () => {
    const { cmdCost } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdCost(["--help"]);
    expect(code).toBe(0);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("cost"));
    consoleSpy.mockRestore();
  });

  it("cost prints three sections", async () => {
    const { cmdCost } = await loadRl();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdCost([]);
    expect(code).toBe(0);
    const output = consoleSpy.mock.calls.flatMap((c) => c).join("\n");
    expect(output).toContain("(1) Actual Spend");
    expect(output).toContain("(2) Estimated Spend");
    expect(output).toContain("(3) Max Potential Spend");
    consoleSpy.mockRestore();
  });
});
