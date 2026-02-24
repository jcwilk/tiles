/**
 * API client for the Tiles worker.
 * Calls /generate to request AI-merged GLSL from two fragment shaders.
 */
import { getApiUrl } from "./env.js";

export interface GenerateResponse {
  fragmentSource: string;
  tokensUsed?: number;
}

export interface GenerateError {
  error: string;
  details?: string;
  retryAfter?: number;
}

export async function generateMerge(
  fragmentA: string,
  fragmentB: string,
  previousError?: string
): Promise<GenerateResponse> {
  const url = `${getApiUrl()}/generate`;
  const body: Record<string, string> = { fragmentA, fragmentB };
  if (previousError) {
    body.previousError = previousError;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as GenerateResponse | GenerateError;

  if (!res.ok) {
    const err = data as GenerateError;
    throw new Error(err.details ?? err.error ?? `Request failed: ${res.status}`);
  }

  const ok = data as GenerateResponse;
  if (typeof ok.fragmentSource !== "string") {
    throw new Error("Invalid response: missing fragmentSource");
  }

  return ok;
}
