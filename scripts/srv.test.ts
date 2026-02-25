/**
 * Tests for srv CLI (server status and management).
 * Mocks fetch, fs, spawn, and process.kill to avoid real network/process ops.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Prevent srv's main() from running when imported for tests
process.env.SRV_TEST = "1";

const mockSpawn = vi.hoisted(() =>
  vi.fn(() => ({ pid: 12345, unref: vi.fn() }))
);
vi.mock("child_process", () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Use dynamic import so we can set env before loading (env read at module init)
async function loadSrv(env: Record<string, string> = {}) {
  vi.resetModules();
  const orig: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) orig[k] = process.env[k];
  Object.assign(process.env, { SRV_TEST: "1", ...env });
  const mod = await import("./srv");
  for (const k of Object.keys(env)) {
    if (orig[k] !== undefined) process.env[k] = orig[k];
    else delete process.env[k];
  }
  return mod;
}

describe("srv checkUrl", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve({
          ok: url.includes("ok") || url.includes("localhost"),
          status: url.includes("ok") || url.includes("localhost") ? 200 : 404,
        } as Response)
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when fetch succeeds", async () => {
    const { checkUrl } = await loadSrv();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const ok = await checkUrl("http://localhost:5173/", "frontend");
    expect(ok).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("OK"));
    consoleSpy.mockRestore();
  });

  it("returns false when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network error")))
    );
    const { checkUrl } = await loadSrv();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const ok = await checkUrl("http://bad.example/", "test");
    expect(ok).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("FAIL"));
    consoleSpy.mockRestore();
  });
});

describe("srv cmdStatus", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ ok: true, status: 200 } as Response)
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("status local returns 0 when both endpoints reachable", async () => {
    const { cmdStatus } = await loadSrv();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdStatus("local");
    expect(code).toBe(0);
    consoleSpy.mockRestore();
  });

  it("status help returns 0", async () => {
    const { cmdStatus } = await loadSrv();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdStatus("--help");
    expect(code).toBe(0);
    consoleSpy.mockRestore();
  });

  it("status remote returns 1 when env vars not set", async () => {
    const { cmdStatus } = await loadSrv({
      SRV_REMOTE_FRONTEND_URL: "",
      SRV_REMOTE_WORKER_URL: "",
      VITE_API_URL: "",
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await cmdStatus("remote");
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("SRV_REMOTE_FRONTEND_URL")
    );
    errSpy.mockRestore();
  });

  it("status remote returns 0 when endpoints reachable", async () => {
    const { cmdStatus } = await loadSrv({
      SRV_REMOTE_FRONTEND_URL: "https://example.github.io/tiles/",
      SRV_REMOTE_WORKER_URL: "https://worker.example.com",
    });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdStatus("remote");
    expect(code).toBe(0);
    consoleSpy.mockRestore();
  });

  it("status unknown returns 1", async () => {
    const { cmdStatus } = await loadSrv();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await cmdStatus("unknown");
    expect(code).toBe(1);
    errSpy.mockRestore();
  });
});

describe("srv cmdStart / cmdStop", () => {
  let tmpDir: string;
  let pidfile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "srv-test-"));
    pidfile = path.join(tmpDir, ".srv-dev.pid");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("cmdStart returns 1 when pidfile exists", async () => {
    fs.writeFileSync(pidfile, "99999");
    const { cmdStart } = await loadSrv({ SRV_PIDFILE: pidfile });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = cmdStart();
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("pidfile exists")
    );
    errSpy.mockRestore();
    fs.unlinkSync(pidfile);
  });

  it("cmdStart writes pidfile and returns 0", async () => {
    mockSpawn.mockReturnValue({ pid: 12345, unref: vi.fn() });
    const { cmdStart } = await loadSrv({ SRV_PIDFILE: pidfile });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = cmdStart();
    expect(code).toBe(0);
    expect(fs.existsSync(pidfile)).toBe(true);
    expect(fs.readFileSync(pidfile, "utf8")).toBe("12345");
    consoleSpy.mockRestore();
  });

  it("cmdStop returns 1 when pidfile missing", async () => {
    const { cmdStop } = await loadSrv({ SRV_PIDFILE: pidfile });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const code = await cmdStop();
    expect(code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("No pidfile")
    );
    errSpy.mockRestore();
  });

  it("cmdStop removes pidfile and kills process", async () => {
    fs.writeFileSync(pidfile, "99999");
    const killSpy = vi.spyOn(process, "kill").mockImplementation(() => {
      throw new Error("no such process");
    });
    const { cmdStop } = await loadSrv({ SRV_PIDFILE: pidfile });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const code = await cmdStop();
    expect(code).toBe(0);
    expect(fs.existsSync(pidfile)).toBe(false);
    killSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe("srv cmdRestart", () => {
  let tmpDir: string;
  let pidfile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "srv-test-"));
    pidfile = path.join(tmpDir, ".srv-dev.pid");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  });

  it("cmdRestart starts when no pidfile", async () => {
    mockSpawn.mockReturnValue({ pid: 11111, unref: vi.fn() });
    const { cmdRestart } = await loadSrv({ SRV_PIDFILE: pidfile });
    const code = await cmdRestart();
    expect(code).toBe(0);
    expect(fs.existsSync(pidfile)).toBe(true);
  });
});
