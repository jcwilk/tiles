/**
 * Merge orchestration tests.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders
 * to test retry loop and error toast without real GPU.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { performMerge } from "./merge.js";
import { createInMemoryStorage } from "./storage.js";
import type { ShaderObject } from "./types.js";

const MOCK_SHADER: ShaderObject = {
  id: "s1",
  name: "A",
  vertexSource: "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: "void main(){ fragColor=vec4(1,0,0,1); }",
  createdAt: 0,
};

const MOCK_SHADER_B: ShaderObject = {
  ...MOCK_SHADER,
  id: "s2",
  name: "B",
  fragmentSource: "void main(){ fragColor=vec4(0,1,0,1); }",
};

vi.mock("./toast.js", () => ({
  showToast: vi.fn(),
}));

describe("performMerge", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("saves to storage and returns success when API returns [VALID CODE]", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ fragmentSource: "[VALID CODE]" }),
    });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(result.shader!.fragmentSource).toBe("[VALID CODE]");
    expect(result.shader!.name).toContain("Merge");
    expect(result.shader!.id).toBeDefined();

    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(result.shader!.id);
  });

  it("retries up to 3 times when API returns [INVALID CODE], then shows toast", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ fragmentSource: "[INVALID CODE]" }),
    });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(
      "Shader failed to compile after 3 attempts. Please try again."
    );

    const all = await storage.getAll();
    expect(all).toHaveLength(0);
  });

  it("passes previousError to API on retry", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      callCount++;
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (callCount === 1) {
        expect(body.previousError).toBeUndefined();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ fragmentSource: "[INVALID CODE]" }),
        });
      }
      if (callCount === 2) {
        expect(body.previousError).toBe("[INVALID CODE]");
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ fragmentSource: "[VALID CODE]" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ fragmentSource: "[INVALID CODE]" }),
      });
    });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("shows toast and returns failure when API returns error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Rate limit exceeded" }),
    });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Rate limit"));
  });
});
