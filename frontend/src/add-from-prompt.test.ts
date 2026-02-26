/**
 * Add-from-prompt tests.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { performAddFromPrompt } from "./add-from-prompt.js";
import { createInMemoryStorage } from "./storage.js";
import {
  createMockFetchHarness,
  VALID_CODE,
  INVALID_CODE,
} from "./test-harness.js";

vi.mock("./toast.js", () => ({
  showToast: vi.fn(),
}));

describe("performAddFromPrompt", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns failure when prompt is empty", async () => {
    const storage = createInMemoryStorage();
    const result = await performAddFromPrompt("", storage);
    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
  });

  it("returns failure when prompt is whitespace only", async () => {
    const storage = createInMemoryStorage();
    const result = await performAddFromPrompt("   ", storage);
    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
  });

  it("saves to storage and returns success when API returns [VALID CODE]", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });

    const storage = createInMemoryStorage();
    const result = await performAddFromPrompt("blue gradient", storage);

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(result.shader!.fragmentSource).toBe(VALID_CODE);
    expect(result.shader!.name).toBe("blue gradient");
    expect(result.shader!.id).toBeDefined();

    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(result.shader!.id);
  });

  it("calls generate-from-prompt endpoint", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });

    const storage = createInMemoryStorage();
    await performAddFromPrompt("red plasma", storage);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/generate-from-prompt");
    expect(init?.method).toBe("POST");
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body.prompt).toBe("red plasma");
  });

  it("retries up to 3 times when API returns [INVALID CODE], then shows toast", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });

    const storage = createInMemoryStorage();
    const result = await performAddFromPrompt("test", storage);

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
    const result = await performAddFromPrompt("test", storage);

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
    const result = await performAddFromPrompt("test", storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Generation failed"));
  });
});
