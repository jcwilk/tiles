/**
 * Merge orchestration tests.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders
 * to test retry loop and error toast without real GPU.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { performMerge } from "./merge.js";
import { createInMemoryStorage } from "./storage.js";
import {
  createMockFetchHarness,
  VALID_CODE,
  INVALID_CODE,
} from "./test-harness.js";
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
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(result.shader!.fragmentSource).toBe(VALID_CODE);
    expect(result.shader!.name).toContain("Merge");
    expect(result.shader!.id).toBeDefined();

    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(result.shader!.id);
  });

  it("retries up to 3 times when API returns [INVALID CODE], then shows toast", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });

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

  it("passes previousError to API on retry and succeeds on second attempt", async () => {
    globalThis.fetch = createMockFetchHarness({
      responses: [INVALID_CODE, VALID_CODE],
    });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const firstBody = JSON.parse((calls[0][1] as RequestInit).body as string);
    const secondBody = JSON.parse((calls[1][1] as RequestInit).body as string);
    expect(firstBody.previousError).toBeUndefined();
    expect(secondBody.previousError).toBe(INVALID_CODE);
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

  it("shows toast and returns failure when fetch throws (e.g. Failed to fetch)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith("Merge failed: Failed to fetch");
  });

  it("saved shader has correct structure and state", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(true);
    const shader = result.shader!;
    expect(shader.id).toBeDefined();
    expect(typeof shader.id).toBe("string");
    expect(shader.name).toContain("Merge");
    expect(shader.name).toContain("A");
    expect(shader.name).toContain("B");
    expect(shader.vertexSource).toContain("a_position");
    expect(shader.fragmentSource).toBe(VALID_CODE);
    expect(typeof shader.createdAt).toBe("number");
    expect(shader.createdAt).toBeGreaterThan(0);

    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(shader);
  });

  it("does not save to storage when all retries fail", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });

    const storage = createInMemoryStorage();
    await storage.add(MOCK_SHADER);
    await storage.add(MOCK_SHADER_B);
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(false);
    const all = await storage.getAll();
    expect(all).toHaveLength(2);
  });

  it("shows toast and returns failure when API returns 200 but fragmentSource is missing", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ tokensUsed: 100 }),
    });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Merge failed"));
  });

  it("shows toast and returns failure when API returns 200 but fragmentSource is not a string", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ fragmentSource: 123, tokensUsed: 100 }),
    });

    const storage = createInMemoryStorage();
    const result = await performMerge(MOCK_SHADER, MOCK_SHADER_B, storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Merge failed"));
  });
});
