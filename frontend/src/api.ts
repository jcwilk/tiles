/**
 * API client for the Tiles worker.
 * Calls /generate-from-prompt for new tiles.
 * Calls /suggest and /apply-directive for the edit view.
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

export async function generateFromPrompt(
  prompt: string,
  previousError?: string,
  signal?: AbortSignal
): Promise<GenerateResponse> {
  const url = `${getApiUrl()}/generate-from-prompt`;
  const body: Record<string, string> = { prompt };
  if (previousError) {
    body.previousError = previousError;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
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

export type Adventurousness = "conservative" | "moderate" | "wild";

export interface SuggestResponse {
  suggestion: string;
}

export async function fetchSuggestion(
  fragmentSource: string,
  adventurousness: Adventurousness,
  signal?: AbortSignal
): Promise<SuggestResponse> {
  const url = `${getApiUrl()}/suggest`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fragmentSource, adventurousness }),
    signal,
  });

  const data = (await res.json()) as SuggestResponse | GenerateError;

  if (!res.ok) {
    const err = data as GenerateError;
    throw new Error(err.details ?? err.error ?? `Request failed: ${res.status}`);
  }

  const ok = data as SuggestResponse;
  if (typeof ok.suggestion !== "string") {
    throw new Error("Invalid response: missing suggestion");
  }

  return ok;
}

export async function applyDirective(
  fragmentSource: string,
  directive: string,
  contextShaders?: string[],
  previousError?: string,
  signal?: AbortSignal
): Promise<GenerateResponse> {
  const url = `${getApiUrl()}/apply-directive`;
  const body: {
    fragmentSource: string;
    directive: string;
    contextShaders?: string[];
    previousError?: string;
  } = {
    fragmentSource,
    directive,
  };
  if (contextShaders && contextShaders.length > 0) {
    body.contextShaders = contextShaders;
  }
  if (previousError) {
    body.previousError = previousError;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
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
