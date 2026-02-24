/**
 * Add-from-voice tests.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { processAudioBlob, performAddFromVoice } from "./add-from-voice.js";
import { createInMemoryStorage } from "./storage.js";
import { VALID_CODE, INVALID_CODE } from "./test-harness.js";

vi.mock("./toast.js", () => ({
  showToast: vi.fn(),
}));

function createMockFetchForAddFromVoice(transcribeText: string, generateResponse: string) {
  return vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    if (url.includes("/transcribe")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ text: transcribeText }),
      });
    }
    if (url.includes("/generate-from-prompt")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            fragmentSource: generateResponse,
            tokensUsed: 100,
          }),
      });
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

describe("processAudioBlob", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("saves to storage and returns success when transcribe and generate succeed", async () => {
    globalThis.fetch = createMockFetchForAddFromVoice("blue gradient", VALID_CODE) as unknown as typeof fetch;

    const storage = createInMemoryStorage();
    const blob = new Blob(["fake-audio"], { type: "audio/webm" });
    const result = await processAudioBlob(blob, storage);

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(result.shader!.fragmentSource).toBe(VALID_CODE);
    expect(result.shader!.name).toContain("blue gradient");
    expect(result.shader!.id).toBeDefined();

    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(result.shader!.id);

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("returns failure when transcription is empty", async () => {
    globalThis.fetch = createMockFetchForAddFromVoice("", VALID_CODE) as unknown as typeof fetch;

    const storage = createInMemoryStorage();
    const blob = new Blob(["fake-audio"], { type: "audio/webm" });
    const result = await processAudioBlob(blob, storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith("No speech detected. Please try again.");
  });

  it("retries up to 3 times when generate returns [INVALID CODE]", async () => {
    globalThis.fetch = createMockFetchForAddFromVoice("red plasma", INVALID_CODE) as unknown as typeof fetch;

    const storage = createInMemoryStorage();
    const blob = new Blob(["fake-audio"], { type: "audio/webm" });
    const result = await processAudioBlob(blob, storage);

    expect(result.success).toBe(false);
    expect(result.shader).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(
      "Shader failed to compile after 3 attempts. Please try again."
    );
  });

  it("succeeds on second attempt when first returns [INVALID CODE]", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes("/transcribe")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ text: "gradient" }),
        });
      }
      callCount++;
      const fragmentSource = callCount === 1 ? INVALID_CODE : VALID_CODE;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            fragmentSource,
            tokensUsed: 100,
          }),
      });
    }) as unknown as typeof fetch;

    const storage = createInMemoryStorage();
    const blob = new Blob(["fake-audio"], { type: "audio/webm" });
    const result = await processAudioBlob(blob, storage);

    expect(result.success).toBe(true);
    expect(result.shader).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("returns session with promise and stop for tap-to-stop", async () => {
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream;
    let ondataavailable: ((e: { data: Blob }) => void) | null = null;
    let onstop: (() => void) | null = null;
    const mockRecorder = {
      state: "recording",
      start: vi.fn(),
      stop: vi.fn(() => {
        mockRecorder.state = "inactive";
        ondataavailable?.({ data: new Blob(["x"]) });
        onstop?.();
      }),
      get ondataavailable() {
        return ondataavailable;
      },
      set ondataavailable(fn: (e: { data: Blob }) => void) {
        ondataavailable = fn;
      },
      get onstop() {
        return onstop;
      },
      set onstop(fn: () => void) {
        onstop = fn;
      },
      onerror: null as (() => void) | null,
    };
    vi.stubGlobal("MediaRecorder", vi.fn(() => mockRecorder));
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    globalThis.fetch = createMockFetchForAddFromVoice("test", VALID_CODE) as unknown as typeof fetch;

    const storage = createInMemoryStorage();
    const session = performAddFromVoice(storage);

    expect(session).toHaveProperty("promise");
    expect(session).toHaveProperty("stop");
    expect(typeof session.stop).toBe("function");

    await new Promise((r) => setTimeout(r, 0));
    session.stop();
    const result = await session.promise;
    expect(result).toHaveProperty("success");

    vi.unstubAllGlobals();
  });

  it("shows toast when transcribe API fails", async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      if (url.includes("/transcribe")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Transcription failed" }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ fragmentSource: VALID_CODE }) });
    }) as unknown as typeof fetch;

    const storage = createInMemoryStorage();
    const blob = new Blob(["fake-audio"], { type: "audio/webm" });
    const result = await processAudioBlob(blob, storage);

    expect(result.success).toBe(false);
    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("Transcription"));
  });
});
