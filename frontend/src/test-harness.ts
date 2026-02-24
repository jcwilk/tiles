/**
 * Configurable test harnesses for mock AI responses.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] to exercise
 * compilation retry loop without GPU usage.
 */
import { vi } from "vitest";

/** Placeholder strings for shader compilation mocks */
export const VALID_CODE = "[VALID CODE]";
export const INVALID_CODE = "[INVALID CODE]";

export type MockResponseConfig =
  | { response: typeof VALID_CODE | typeof INVALID_CODE }
  | { responses: string[] };

/**
 * Creates a fetch mock that returns configurable AI responses.
 * Use to control whether mock AI returns [VALID CODE] or [INVALID CODE]
 * for testing the agentic feedback loop without GPU.
 *
 * @example
 * // Always return valid code
 * globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });
 *
 * @example
 * // Always return invalid (exhaust retries)
 * globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });
 *
 * @example
 * // Fail first attempt, succeed on retry
 * globalThis.fetch = createMockFetchHarness({
 *   responses: [INVALID_CODE, VALID_CODE],
 * });
 */
export function createMockFetchHarness(config: MockResponseConfig): ReturnType<typeof vi.fn> {
  const responses =
    "responses" in config ? [...config.responses] : [config.response];
  let callIndex = 0;

  return vi.fn((_url: string, _init?: RequestInit) => {
    const response =
      responses[Math.min(callIndex++, responses.length - 1)] ??
      responses[responses.length - 1];
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          fragmentSource: response,
          tokensUsed: 100,
        }),
    });
  });
}
