/**
 * Apply directive tests: compile-retry loop with [VALID CODE]/[INVALID CODE].
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { performApplyDirective } from "./apply-directive.js";
import { createInMemoryStorage } from "./storage.js";
import {
  createMockFetchHarness,
  VALID_CODE,
  INVALID_CODE,
} from "./test-harness.js";
import type { ShaderObject } from "./types.js";

const MOCK_SHADER: ShaderObject = {
  id: "s1",
  name: "Test",
  vertexSource: "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: "void main(){ fragColor=vec4(1,0,0,1); }",
  createdAt: 0,
};

vi.mock("./toast.js", () => ({
  showToast: vi.fn(),
}));

describe("performApplyDirective", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("saves to storage and returns success when API returns [VALID CODE]", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });

    const storage = createInMemoryStorage();
    const result = await performApplyDirective(
      MOCK_SHADER,
      "add a pulsing glow",
      storage
    );

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(result.shader!.fragmentSource).toBe(VALID_CODE);
    expect(result.shader!.id).toBeDefined();

    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(result.shader!.id);
  });

  it("retries up to 3 times when API returns [INVALID CODE], then shows toast", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });

    const storage = createInMemoryStorage();
    const result = await performApplyDirective(
      MOCK_SHADER,
      "add glow",
      storage
    );

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
    const result = await performApplyDirective(
      MOCK_SHADER,
      "add glow",
      storage
    );

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const firstBody = JSON.parse((calls[0][1] as RequestInit).body as string);
    const secondBody = JSON.parse((calls[1][1] as RequestInit).body as string);
    expect(firstBody.previousError).toBeUndefined();
    expect(secondBody.previousError).toBe(INVALID_CODE);
  });

  it("passes context shaders when provided", async () => {
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      expect(body.contextShaders).toBeDefined();
      expect(body.contextShaders).toHaveLength(1);
      expect(body.contextShaders[0]).toContain("vec4(0,1,0,1)");
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            fragmentSource: VALID_CODE,
            tokensUsed: 100,
          }),
      } as Response);
    }) as typeof fetch;

    const contextShader: ShaderObject = {
      ...MOCK_SHADER,
      id: "s2",
      fragmentSource: "void main(){ fragColor=vec4(0,1,0,1); }",
    };

    const storage = createInMemoryStorage();
    const result = await performApplyDirective(
      MOCK_SHADER,
      "combine",
      storage,
      [contextShader]
    );

    expect(result.success).toBe(true);
  });
});
