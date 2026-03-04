/**
 * API hooks tests: compile-retry, state transitions, parallel suggestions.
 * Uses createMockFetchHarness with [VALID CODE]/[INVALID CODE].
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useGenerateFromPrompt,
  useFetchSuggestions,
  useApplyDirective,
} from "./api-hooks.js";
import {
  createMockFetchHarness,
  VALID_CODE,
  INVALID_CODE,
} from "./test-harness.js";
import {
  createWrapperForHook,
  createMockShader,
} from "./test-utils.js";

const MOCK_SHADER = createMockShader({
  id: "s1",
  name: "Test",
  vertexSource:
    "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: "void main(){ fragColor=vec4(1,0,0,1); }",
  createdAt: 0,
});

describe("useGenerateFromPrompt", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns initial state", async () => {
    const wrapper = createWrapperForHook();
    const { result } = renderHook(() => useGenerateFromPrompt(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
    expect(typeof result.current.execute).toBe("function");
  });

  it("succeeds when API returns [VALID CODE] and adds shader", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useGenerateFromPrompt(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute("blue gradient");
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.fragmentSource).toBe(VALID_CODE);
    expect(result.current.data!.name).toBe("blue gradient");
    expect(result.current.error).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("retries up to 3 times when API returns [INVALID CODE]", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useGenerateFromPrompt(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute("test");
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.error!.message).toContain("3 attempts");
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("passes previousError on retry and succeeds on second attempt", async () => {
    globalThis.fetch = createMockFetchHarness({
      responses: [INVALID_CODE, VALID_CODE],
    });
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useGenerateFromPrompt(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute("test");
    });

    expect(result.current.data).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const secondBody = JSON.parse((calls[1][1] as RequestInit).body as string);
    expect(secondBody.previousError).toBe(INVALID_CODE);
  });

  it("does nothing when prompt is empty", async () => {
    globalThis.fetch = vi.fn();
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useGenerateFromPrompt(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute("");
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("passes AbortSignal and aborts in-flight request on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true }
        );
      });
    }) as typeof fetch;
    const wrapper = createWrapperForHook();

    const { result, unmount } = renderHook(() => useGenerateFromPrompt(), { wrapper });

    act(() => {
      void result.current.execute("blue gradient");
    });

    await waitFor(() => {
      expect(capturedSignal).toBeDefined();
    });

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe("useFetchSuggestions", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fires 3 parallel requests and returns results by tier", async () => {
    const calls: {
      body: { adventurousness: string };
      signal?: AbortSignal;
    }[] = [];
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      calls.push({ body, signal: init?.signal as AbortSignal | undefined });
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ suggestion: `suggestion-${body.adventurousness}` }),
      } as Response);
    }) as typeof fetch;

    const wrapper = createWrapperForHook({ needsShader: false });

    const { result } = renderHook(() => useFetchSuggestions(), { wrapper });

    await act(async () => {
      await result.current.execute("void main(){}");
    });

    expect(calls).toHaveLength(3);
    const tiers = calls.map((c) => c.body.adventurousness).sort();
    expect(tiers).toEqual(["conservative", "moderate", "wild"]);
    expect(calls.every((c) => c.signal instanceof AbortSignal)).toBe(true);
    expect(new Set(calls.map((c) => c.signal)).size).toBe(1);
    expect(result.current.data.conservative).toBe("suggestion-conservative");
    expect(result.current.data.moderate).toBe("suggestion-moderate");
    expect(result.current.data.wild).toBe("suggestion-wild");
  });

  it("updates loadingByTier as each tier completes", async () => {
    const delays: Record<string, number> = {
      conservative: 0,
      moderate: 30,
      wild: 60,
    };
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      const tier = body.adventurousness;
      return new Promise<Response>((resolve) => {
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: () => Promise.resolve({ suggestion: tier }),
            } as Response),
          delays[tier] ?? 0
        );
      });
    }) as typeof fetch;

    const wrapper = createWrapperForHook({ needsShader: false });

    const { result } = renderHook(() => useFetchSuggestions(), { wrapper });

    act(() => {
      void result.current.execute("void main(){}");
    });

    expect(result.current.loadingByTier.conservative).toBe(true);
    expect(result.current.loadingByTier.moderate).toBe(true);
    expect(result.current.loadingByTier.wild).toBe(true);

    await waitFor(
      () => {
        expect(result.current.loadingByTier.conservative).toBe(false);
      },
      { timeout: 100 }
    );

    await waitFor(
      () => {
        expect(result.current.loadingByTier.moderate).toBe(false);
      },
      { timeout: 100 }
    );

    await waitFor(
      () => {
        expect(result.current.loadingByTier.wild).toBe(false);
      },
      { timeout: 100 }
    );
  });

  it("aborts in-flight suggestion requests without setting error", async () => {
    const signals = new Set<AbortSignal>();
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal;
      signals.add(signal);
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true }
        );
      });
    }) as typeof fetch;

    const wrapper = createWrapperForHook({ needsShader: false });
    const { result } = renderHook(() => useFetchSuggestions(), { wrapper });

    act(() => {
      void result.current.execute("void main(){}");
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    act(() => {
      result.current.abort();
    });

    expect(signals.size).toBe(1);
    for (const signal of signals) {
      expect(signal.aborted).toBe(true);
    }

    await waitFor(() => {
      expect(result.current.loadingByTier.conservative).toBe(false);
      expect(result.current.loadingByTier.moderate).toBe(false);
      expect(result.current.loadingByTier.wild).toBe(false);
    });
    expect(result.current.error).toBeUndefined();
  });
});

describe("useApplyDirective", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("succeeds when API returns [VALID CODE] and adds shader", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useApplyDirective(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute(MOCK_SHADER, "add a pulsing glow");
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data!.fragmentSource).toBe(VALID_CODE);
    expect(result.current.error).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries up to 3 times when API returns [INVALID CODE]", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useApplyDirective(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute(MOCK_SHADER, "add glow");
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.error!.message).toContain("3 attempts");
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("passes previousError on retry and succeeds on second attempt", async () => {
    globalThis.fetch = createMockFetchHarness({
      responses: [INVALID_CODE, VALID_CODE],
    });
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useApplyDirective(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute(MOCK_SHADER, "add glow");
    });

    expect(result.current.data).toBeDefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const secondBody = JSON.parse((calls[1][1] as RequestInit).body as string);
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

    const contextShader = createMockShader({
      ...MOCK_SHADER,
      id: "s2",
      fragmentSource: "void main(){ fragColor=vec4(0,1,0,1); }",
    });
    const wrapper = createWrapperForHook();

    const { result } = renderHook(() => useApplyDirective(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.execute(MOCK_SHADER, "combine", [contextShader]);
    });

    expect(result.current.data).toBeDefined();
  });

  it("passes AbortSignal and aborts in-flight request on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal as AbortSignal | undefined;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true }
        );
      });
    }) as typeof fetch;
    const wrapper = createWrapperForHook();

    const { result, unmount } = renderHook(() => useApplyDirective(), { wrapper });

    act(() => {
      void result.current.execute(MOCK_SHADER, "add glow");
    });

    await waitFor(() => {
      expect(capturedSignal).toBeDefined();
    });

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
