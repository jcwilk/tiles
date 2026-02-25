/**
 * API client for the Tiles worker.
 * Calls /generate to request AI-merged GLSL from two fragment shaders.
 * Calls /transcribe for voice-to-text and /generate-from-prompt for new tiles.
 * Calls /apply-directive to modify a shader per text directive.
 */
import { getApiUrl } from "./env.js";

export interface GenerateResponse {
  fragmentSource: string;
  tokensUsed?: number;
}

export interface TranscribeResponse {
  text: string;
}

export interface GenerateError {
  error: string;
  details?: string;
  retryAfter?: number;
}

export async function transcribeAudio(audioBase64: string): Promise<TranscribeResponse> {
  const url = `${getApiUrl()}/transcribe`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64 }),
  });

  const data = (await res.json()) as TranscribeResponse | GenerateError;

  if (!res.ok) {
    const err = data as GenerateError;
    throw new Error(err.details ?? err.error ?? `Request failed: ${res.status}`);
  }

  const ok = data as TranscribeResponse;
  if (typeof ok.text !== "string") {
    throw new Error("Invalid response: missing text");
  }

  return ok;
}

export async function generateFromPrompt(
  prompt: string,
  previousError?: string
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

export async function applyDirective(
  fragmentSource: string,
  directive: string,
  contextShaders?: string[],
  previousError?: string
): Promise<GenerateResponse> {
  const url = `${getApiUrl()}/apply-directive`;
  const body: Record<string, unknown> = { fragmentSource, directive };
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
