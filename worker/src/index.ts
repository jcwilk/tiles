/**
 * Tiles Worker — Cloudflare Worker AI proxy
 * Proxies LLM requests with CORS and rate limiting.
 */

import type { AiModels } from "@cloudflare/workers-types";
import models from "../models.json";

const TEXT_MODEL = models.text.id as keyof AiModels;
const WHISPER_MODEL = models.whisper.id as keyof AiModels;

/** Allowed origins: GitHub Pages (*.github.io) and localhost for dev */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-zA-Z0-9-]+\.github\.io(\/.*)?$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

/** Token limits (configurable via env and KV) */
const DEFAULT_IP_PER_HOUR = 10_000;
const DEFAULT_GLOBAL_PER_HOUR = 100_000;
const DEFAULT_GLOBAL_PER_DAY = 500_000;

/** Conservative estimate for a single request (prompt + response) when checking limits */
const ESTIMATED_TOKENS_PER_REQUEST = 2000;

export interface Limits {
  ipPerHour: number;
  globalPerHour: number;
  globalPerDay: number;
}

export interface Env {
  AI: Ai;
  RATE_LIMIT_KV: KVNamespace;
  ALERT_EMAIL?: SendEmail;
  ALLOWED_ORIGINS?: string;
  IP_PER_HOUR?: string;
  GLOBAL_PER_HOUR?: string;
  GLOBAL_PER_DAY?: string;
}

/** Get limits with fallback: KV config:limits -> env vars -> defaults. Exported for tests. */
export async function getLimits(env: Env): Promise<Limits> {
  const fromEnv = {
    ipPerHour: parseInt(env.IP_PER_HOUR ?? "", 10) || DEFAULT_IP_PER_HOUR,
    globalPerHour: parseInt(env.GLOBAL_PER_HOUR ?? "", 10) || DEFAULT_GLOBAL_PER_HOUR,
    globalPerDay: parseInt(env.GLOBAL_PER_DAY ?? "", 10) || DEFAULT_GLOBAL_PER_DAY,
  };
  const raw = await env.RATE_LIMIT_KV.get("config:limits");
  if (!raw) return fromEnv;
  try {
    const parsed = JSON.parse(raw) as { ipPerHour?: number; globalPerHour?: number; globalPerDay?: number };
    return {
      ipPerHour: typeof parsed.ipPerHour === "number" ? parsed.ipPerHour : fromEnv.ipPerHour,
      globalPerHour: typeof parsed.globalPerHour === "number" ? parsed.globalPerHour : fromEnv.globalPerHour,
      globalPerDay: typeof parsed.globalPerDay === "number" ? parsed.globalPerDay : fromEnv.globalPerDay,
    };
  } catch {
    return fromEnv;
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const corsHeaders = getCorsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return handleCorsPreflight(corsHeaders);
    }

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return jsonResponse({ status: "ok" }, 200, corsHeaders);
    }

    if (url.pathname === "/usage" && request.method === "GET") {
      return handleUsage(env, corsHeaders);
    }

    if (url.pathname === "/generate" && request.method === "POST") {
      return handleGenerate(request, env, corsHeaders);
    }

    if (url.pathname === "/transcribe" && request.method === "POST") {
      return handleTranscribe(request, env, corsHeaders);
    }

    if (url.pathname === "/generate-from-prompt" && request.method === "POST") {
      return handleGenerateFromPrompt(request, env, corsHeaders);
    }

    if (url.pathname === "/apply-directive" && request.method === "POST") {
      return handleApplyDirective(request, env, corsHeaders);
    }

    if (url.pathname === "/suggest" && request.method === "POST") {
      return handleSuggest(request, env, corsHeaders);
    }

    return jsonResponse({ error: "Not Found" }, 404, corsHeaders);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};

function getCorsHeaders(origin: string, env: Env): Record<string, string> {
  const allowed = isOriginAllowed(origin, env);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

interface TranscribeBody {
  /** Base64-encoded audio (WAV, MP3, WebM, etc.) */
  audioBase64: string;
}

async function handleTranscribe(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const origin = request.headers.get("Origin") ?? "";
  if (!isOriginAllowed(origin, env)) {
    return jsonResponse({ error: "Forbidden: origin not allowed" }, 403, corsHeaders);
  }

  let body: TranscribeBody;
  try {
    body = (await request.json()) as TranscribeBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { audioBase64 } = body;
  if (typeof audioBase64 !== "string" || !audioBase64) {
    return jsonResponse({ error: "Missing or invalid audioBase64" }, 400, corsHeaders);
  }

  let audioBytes: number[];
  try {
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    audioBytes = [...bytes];
  } catch {
    return jsonResponse({ error: "Invalid base64 audio data" }, 400, corsHeaders);
  }

  if (audioBytes.length === 0) {
    return jsonResponse({ error: "Audio data is empty" }, 400, corsHeaders);
  }

  try {
    const response = (await env.AI.run(WHISPER_MODEL, { audio: audioBytes })) as { text?: string };
    const text = typeof response.text === "string" ? response.text.trim() : "";
    return jsonResponse({ text }, 200, corsHeaders);
  } catch (err) {
    console.error("Whisper transcription error:", err);
    return jsonResponse(
      {
        error: "Transcription failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      502,
      corsHeaders
    );
  }
}

interface GenerateFromPromptBody {
  prompt: string;
  previousError?: string;
}

async function handleGenerateFromPrompt(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const origin = request.headers.get("Origin") ?? "";
  if (!isOriginAllowed(origin, env)) {
    return jsonResponse({ error: "Forbidden: origin not allowed" }, 403, corsHeaders);
  }

  let body: GenerateFromPromptBody;
  try {
    body = (await request.json()) as GenerateFromPromptBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { prompt, previousError } = body;
  if (typeof prompt !== "string" || !prompt.trim()) {
    return jsonResponse({ error: "Missing or invalid prompt" }, 400, corsHeaders);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limits = await getLimits(env);

  const rateLimitResult = await checkRateLimits(env.RATE_LIMIT_KV, ip, limits);
  if (!rateLimitResult.allowed) {
    return jsonResponse(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitResult.retryAfter,
      },
      429,
      {
        ...corsHeaders,
        ...(rateLimitResult.retryAfter ? { "Retry-After": String(rateLimitResult.retryAfter) } : {}),
      }
    );
  }

  const userPrompt = buildGenerateFromPromptUserMessage(prompt.trim(), previousError);

  try {
    const response = await env.AI.run(TEXT_MODEL, {
      messages: [
        {
          role: "system",
          content: `You are an expert GLSL shader programmer. You generate WebGL fragment shaders from natural language descriptions.

CRITICAL: Output raw GLSL fragment shader code ONLY. No markdown, no code fences, no explanations.
Required format:
- First line: #version 300 es
- Second line: precision highp float;
- Required API: uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_touch; in vec2 v_uv; out vec4 fragColor;
- End with your main() and fragColor assignment.`,
        },
        { role: "user", content: userPrompt },
      ],
      max_tokens: models.text.maxTokens,
    });

    const result = response as {
      response?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const generated = typeof result.response === "string" ? result.response : String(result?.response ?? "");
    const usage = result.usage;
    const tokensUsed = usage?.total_tokens ?? estimateTokens(userPrompt + generated);

    await incrementRateLimits(env.RATE_LIMIT_KV, ip, tokensUsed);

    const fragmentSource = sanitizeGLSL(generated);

    return jsonResponse(
      {
        fragmentSource,
        tokensUsed,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    console.error("AI run error:", err);
    return jsonResponse(
      {
        error: "AI generation failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      502,
      corsHeaders
    );
  }
}

function buildGenerateFromPromptUserMessage(prompt: string, previousError?: string): string {
  let msg = `Generate a GLSL fragment shader based on this description:

"${prompt}"

Output raw GLSL only. Start with:
#version 300 es
precision highp float;

Use: uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_touch; in vec2 v_uv; out vec4 fragColor;
`;
  if (previousError) {
    msg += `\nThe previous attempt failed to compile. Fix the error and output corrected GLSL (raw code only, no markdown):\n${previousError}\n\n`;
  }
  msg += `Output the fragment shader (raw GLSL, no \`\`\` fences):`;
  return msg;
}

function isOriginAllowed(origin: string, env: Env): boolean {
  if (!origin) return false;
  if (env.ALLOWED_ORIGINS) {
    const list = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    if (list.includes(origin)) return true;
  }
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function handleCorsPreflight(corsHeaders: Record<string, string>): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

async function handleUsage(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const now = Date.now();
  const hour = hourKey(now);
  const day = dayKey(now);
  const limits = await getLimits(env);

  const [globalHourVal, globalDayVal] = await Promise.all([
    env.RATE_LIMIT_KV.get(`global:hour:${hour}`),
    env.RATE_LIMIT_KV.get(`global:day:${day}`),
  ]);

  const globalHourTokens = parseInt(globalHourVal ?? "0", 10);
  const globalDayTokens = parseInt(globalDayVal ?? "0", 10);

  return jsonResponse(
    {
      hour: { key: hour, globalTokens: globalHourTokens, limit: limits.globalPerHour },
      day: { key: day, globalTokens: globalDayTokens, limit: limits.globalPerDay },
      limits: { ipPerHour: limits.ipPerHour, globalPerHour: limits.globalPerHour, globalPerDay: limits.globalPerDay },
    },
    200,
    corsHeaders
  );
}

interface GenerateBody {
  fragmentA: string;
  fragmentB: string;
  /** Optional: compiler error from previous attempt for retry context */
  previousError?: string;
}

async function handleGenerate(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const origin = request.headers.get("Origin") ?? "";
  if (!isOriginAllowed(origin, env)) {
    return jsonResponse({ error: "Forbidden: origin not allowed" }, 403, corsHeaders);
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { fragmentA, fragmentB, previousError } = body;
  if (typeof fragmentA !== "string" || typeof fragmentB !== "string") {
    return jsonResponse(
      { error: "Missing or invalid fragmentA/fragmentB (must be strings)" },
      400,
      corsHeaders
    );
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limits = await getLimits(env);

  const rateLimitResult = await checkRateLimits(env.RATE_LIMIT_KV, ip, limits);
  if (!rateLimitResult.allowed) {
    return jsonResponse(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitResult.retryAfter,
      },
      429,
      { ...corsHeaders, ...(rateLimitResult.retryAfter ? { "Retry-After": String(rateLimitResult.retryAfter) } : {}) }
    );
  }

  const prompt = buildMergePrompt(fragmentA, fragmentB, typeof previousError === "string" ? previousError : undefined);

  try {
    const response = await env.AI.run(TEXT_MODEL, {
      messages: [
        {
          role: "system",
          content: `You are an expert GLSL shader programmer. You combine fragment shaders into new, creative WebGL shaders.

CRITICAL: Output raw GLSL fragment shader code ONLY. No markdown, no code fences, no explanations.
Required format:
- First line: #version 300 es
- Second line: precision highp float;
- Required API: uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_touch; in vec2 v_uv; out vec4 fragColor;
- End with your main() and fragColor assignment.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: models.text.maxTokens,
    });

    const result = response as { response?: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const generated = typeof result.response === "string" ? result.response : String(result?.response ?? "");
    const usage = result.usage;
    const tokensUsed = usage?.total_tokens ?? estimateTokens(prompt + generated);

    await incrementRateLimits(env.RATE_LIMIT_KV, ip, tokensUsed);

    const fragmentSource = sanitizeGLSL(generated);

    return jsonResponse(
      {
        fragmentSource,
        tokensUsed,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    console.error("AI run error:", err);
    return jsonResponse(
      { error: "AI generation failed", details: err instanceof Error ? err.message : "Unknown error" },
      502,
      corsHeaders
    );
  }
}

/** Exported for prompt eval hash computation (staleness detection) */
export function buildMergePrompt(fragmentA: string, fragmentB: string, previousError?: string): string {
  let base = `Merge these two GLSL fragment shaders into one new shader that creatively combines their visual effects.

Output raw GLSL only. Start with:
#version 300 es
precision highp float;

Use: uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_touch; in vec2 v_uv; out vec4 fragColor;

Shader A:
\`\`\`glsl
${fragmentA}
\`\`\`

Shader B:
\`\`\`glsl
${fragmentB}
\`\`\`
`;
  if (previousError) {
    base += `\nThe previous attempt failed to compile. Fix the error and output corrected GLSL (raw code only, no markdown):\n${previousError}\n\n`;
  }
  base += `Output the merged fragment shader (raw GLSL, no \`\`\` fences):`;
  return base;
}

interface ApplyDirectiveBody {
  fragmentSource: string;
  directive: string;
  contextShaders?: string[];
  previousError?: string;
}

/** Exported for tests */
export function buildApplyDirectivePrompt(
  fragmentSource: string,
  directive: string,
  contextShaders?: string[],
  previousError?: string
): string {
  let base = `Modify the MAIN SHADER below according to the DIRECTIVE. Output raw GLSL only.

CRITICAL: The MAIN SHADER is the one to edit. Any REFERENCE SHADERS are for inspiration only — do not copy them wholesale; use them for ideas.

Output raw GLSL only. Start with:
#version 300 es
precision highp float;

Use: uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_touch; in vec2 v_uv; out vec4 fragColor;

--- MAIN SHADER (the one to edit) ---
\`\`\`glsl
${fragmentSource}
\`\`\`

--- DIRECTIVE ---
${directive}
`;
  if (contextShaders && contextShaders.length > 0) {
    base += `\n--- REFERENCE SHADERS (context only, do not copy wholesale) ---\n`;
    contextShaders.forEach((shader, i) => {
      base += `\nReference ${i + 1}:\n\`\`\`glsl\n${shader}\n\`\`\`\n`;
    });
  }
  if (previousError) {
    base += `\nThe previous attempt failed to compile. Fix the error and output corrected GLSL (raw code only, no markdown):\n${previousError}\n\n`;
  }
  base += `Output the modified fragment shader (raw GLSL, no \`\`\` fences):`;
  return base;
}

async function handleApplyDirective(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const origin = request.headers.get("Origin") ?? "";
  if (!isOriginAllowed(origin, env)) {
    return jsonResponse({ error: "Forbidden: origin not allowed" }, 403, corsHeaders);
  }

  let body: ApplyDirectiveBody;
  try {
    body = (await request.json()) as ApplyDirectiveBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { fragmentSource, directive, contextShaders } = body;
  if (typeof fragmentSource !== "string" || typeof directive !== "string") {
    return jsonResponse(
      { error: "Missing or invalid fragmentSource/directive (must be strings)" },
      400,
      corsHeaders
    );
  }
  if (!directive.trim()) {
    return jsonResponse({ error: "Missing or invalid directive (must be non-empty)" }, 400, corsHeaders);
  }
  if (contextShaders !== undefined) {
    if (!Array.isArray(contextShaders)) {
      return jsonResponse({ error: "contextShaders must be an array of strings" }, 400, corsHeaders);
    }
    const invalid = contextShaders.some((s) => typeof s !== "string");
    if (invalid) {
      return jsonResponse({ error: "contextShaders must contain only strings" }, 400, corsHeaders);
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limits = await getLimits(env);

  const rateLimitResult = await checkRateLimits(env.RATE_LIMIT_KV, ip, limits);
  if (!rateLimitResult.allowed) {
    return jsonResponse(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitResult.retryAfter,
      },
      429,
      {
        ...corsHeaders,
        ...(rateLimitResult.retryAfter ? { "Retry-After": String(rateLimitResult.retryAfter) } : {}),
      }
    );
  }

  const previousError = typeof body.previousError === "string" ? body.previousError : undefined;
  const prompt = buildApplyDirectivePrompt(fragmentSource, directive.trim(), contextShaders, previousError);

  try {
    const response = await env.AI.run(TEXT_MODEL, {
      messages: [
        {
          role: "system",
          content: `You are an expert GLSL shader programmer. You modify fragment shaders according to user directives.

CRITICAL: Output raw GLSL fragment shader code ONLY. No markdown, no code fences, no explanations.
Required format:
- First line: #version 300 es
- Second line: precision highp float;
- Required API: uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_touch; in vec2 v_uv; out vec4 fragColor;
- End with your main() and fragColor assignment.
The MAIN SHADER in the user message is the one to edit. REFERENCE SHADERS (if any) are for inspiration only — do not copy them wholesale.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: models.text.maxTokens,
    });

    const result = response as {
      response?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const generated = typeof result.response === "string" ? result.response : String(result?.response ?? "");
    const usage = result.usage;
    const tokensUsed = usage?.total_tokens ?? estimateTokens(prompt + generated);

    await incrementRateLimits(env.RATE_LIMIT_KV, ip, tokensUsed);

    const sanitized = sanitizeGLSL(generated);

    return jsonResponse(
      {
        fragmentSource: sanitized,
        tokensUsed,
      },
      200,
      corsHeaders
    );
  } catch (err) {
    console.error("AI run error:", err);
    return jsonResponse(
      {
        error: "AI generation failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      502,
      corsHeaders
    );
  }
}

const ADVENTUROUSNESS_VALUES = ["conservative", "moderate", "wild"] as const;
export type Adventurousness = (typeof ADVENTUROUSNESS_VALUES)[number];

/** Maps adventurousness to AI temperature. Exported for tests. */
export function getTemperatureForAdventurousness(a: Adventurousness): number {
  switch (a) {
    case "conservative":
      return 0.3;
    case "moderate":
      return 0.7;
    case "wild":
      return 1.2;
    default:
      return 0.7;
  }
}

interface SuggestBody {
  fragmentSource: string;
  adventurousness: Adventurousness;
}

/** Exported for tests */
export function buildSuggestPrompt(fragmentSource: string): string {
  return `You are looking at this GLSL fragment shader:

\`\`\`glsl
${fragmentSource}
\`\`\`

Suggest ONE short creative modification (1 sentence only). Output plain text only — no GLSL code, no markdown. Example: "Add a subtle pulse that speeds up when the user touches the screen."`;
}

async function handleSuggest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const origin = request.headers.get("Origin") ?? "";
  if (!isOriginAllowed(origin, env)) {
    return jsonResponse({ error: "Forbidden: origin not allowed" }, 403, corsHeaders);
  }

  let body: SuggestBody;
  try {
    body = (await request.json()) as SuggestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const { fragmentSource, adventurousness } = body;
  if (typeof fragmentSource !== "string" || !fragmentSource.trim()) {
    return jsonResponse({ error: "Missing or invalid fragmentSource" }, 400, corsHeaders);
  }
  if (
    typeof adventurousness !== "string" ||
    !ADVENTUROUSNESS_VALUES.includes(adventurousness as Adventurousness)
  ) {
    return jsonResponse(
      { error: "adventurousness must be 'conservative', 'moderate', or 'wild'" },
      400,
      corsHeaders
    );
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limits = await getLimits(env);

  const rateLimitResult = await checkRateLimits(env.RATE_LIMIT_KV, ip, limits);
  if (!rateLimitResult.allowed) {
    return jsonResponse(
      {
        error: "Rate limit exceeded",
        retryAfter: rateLimitResult.retryAfter,
      },
      429,
      {
        ...corsHeaders,
        ...(rateLimitResult.retryAfter ? { "Retry-After": String(rateLimitResult.retryAfter) } : {}),
      }
    );
  }

  const temperature = getTemperatureForAdventurousness(adventurousness as Adventurousness);
  const userPrompt = buildSuggestPrompt(fragmentSource.trim());

  try {
    const response = await env.AI.run(TEXT_MODEL, {
      messages: [
        {
          role: "system",
          content:
            "You are an expert GLSL shader programmer. Suggest one short creative modification for the given shader. Output plain text only — one sentence, no code, no markdown.",
        },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 64,
      temperature,
    });

    const result = response as {
      response?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const suggestion =
      typeof result.response === "string" ? result.response.trim() : String(result?.response ?? "").trim();
    const usage = result.usage;
    const tokensUsed = usage?.total_tokens ?? estimateTokens(userPrompt + suggestion);

    await incrementRateLimits(env.RATE_LIMIT_KV, ip, tokensUsed);

    return jsonResponse({ suggestion }, 200, corsHeaders);
  } catch (err) {
    console.error("AI run error:", err);
    return jsonResponse(
      {
        error: "AI generation failed",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      502,
      corsHeaders
    );
  }
}

/** Test placeholders (CONVENTIONS.md) - pass through unchanged */
const VALID_PLACEHOLDER = "[VALID CODE]";
const INVALID_PLACEHOLDER = "[INVALID CODE]";

/**
 * Sanitize AI-generated GLSL: strip markdown fences, extract code block,
 * ensure #version 300 es and precision highp float.
 */
export function sanitizeGLSL(raw: string): string {
  const t = raw.trim();
  if (t === VALID_PLACEHOLDER || t === INVALID_PLACEHOLDER) return t;

  let code = t;

  // Strip markdown code fences (```glsl ... ``` or ``` ... ```)
  const fenceMatch = code.match(/^```(?:glsl)?\s*\n?([\s\S]*?)\n?```\s*$/m);
  if (fenceMatch) {
    code = fenceMatch[1].trim();
  } else {
    // Strip leading/trailing fences that might be split
    code = code.replace(/^```(?:glsl)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }

  // Strip any prose before first #version or valid GLSL start
  const versionIdx = code.indexOf("#version");
  if (versionIdx > 0) {
    code = code.slice(versionIdx);
  }

  // Ensure #version 300 es (strip any other #version if prepending)
  if (!/^#version\s+300\s+es/im.test(code)) {
    code = code.replace(/^#version\s+\d+\s+\w+\s*\n?/im, "");
    code = "#version 300 es\n" + code.trim();
  }

  // Ensure precision highp float after #version
  if (!/precision\s+(lowp|mediump|highp)\s+float/im.test(code)) {
    code = code.replace(/^(#version\s+300\s+es\s*\n?)/i, "$1precision highp float;\n");
  }

  return code.trim();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function hourKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 13);
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

interface RateLimitCheck {
  allowed: boolean;
  retryAfter?: number;
}

async function checkRateLimits(
  kv: KVNamespace,
  ip: string,
  limits: { ipPerHour: number; globalPerHour: number; globalPerDay: number }
): Promise<RateLimitCheck> {
  const now = Date.now();
  const hour = hourKey(now);
  const day = dayKey(now);

  const [ipVal, globalHourVal, globalDayVal] = await Promise.all([
    kv.get(`ip:${ip}:${hour}`),
    kv.get(`global:hour:${hour}`),
    kv.get(`global:day:${day}`),
  ]);

  const ipTokens = parseInt(ipVal ?? "0", 10);
  const globalHourTokens = parseInt(globalHourVal ?? "0", 10);
  const globalDayTokens = parseInt(globalDayVal ?? "0", 10);

  const afterRequest = ESTIMATED_TOKENS_PER_REQUEST;
  if (ipTokens + afterRequest > limits.ipPerHour) {
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    return { allowed: false, retryAfter: Math.ceil((nextHour.getTime() - now) / 1000) };
  }
  if (globalHourTokens + afterRequest > limits.globalPerHour) {
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0, 0, 0);
    return { allowed: false, retryAfter: Math.ceil((nextHour.getTime() - now) / 1000) };
  }
  if (globalDayTokens + afterRequest > limits.globalPerDay) {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);
    return { allowed: false, retryAfter: Math.ceil((nextDay.getTime() - now) / 1000) };
  }

  return { allowed: true };
}

async function incrementRateLimits(kv: KVNamespace, ip: string, tokens: number): Promise<void> {
  const now = Date.now();
  const hour = hourKey(now);
  const day = dayKey(now);

  const ipKey = `ip:${ip}:${hour}`;
  const globalHourKey = `global:hour:${hour}`;
  const globalDayKey = `global:day:${day}`;

  const [ipVal, globalHourVal, globalDayVal] = await Promise.all([
    kv.get(ipKey),
    kv.get(globalHourKey),
    kv.get(globalDayKey),
  ]);

  const newIp = (parseInt(ipVal ?? "0", 10) + tokens).toString();
  const newGlobalHour = (parseInt(globalHourVal ?? "0", 10) + tokens).toString();
  const newGlobalDay = (parseInt(globalDayVal ?? "0", 10) + tokens).toString();

  const hourTtl = Math.floor(MS_PER_HOUR / 1000) + 3600;
  const dayTtl = Math.floor(MS_PER_DAY / 1000) + 86400;

  await Promise.all([
    kv.put(ipKey, newIp, { expirationTtl: hourTtl }),
    kv.put(globalHourKey, newGlobalHour, { expirationTtl: hourTtl }),
    kv.put(globalDayKey, newGlobalDay, { expirationTtl: dayTtl }),
  ]);
}

function jsonResponse(
  data: unknown,
  status: number,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

interface AlertsConfig {
  email?: string;
  thresholdPercent?: number;
  alertHour?: boolean;
  alertDay?: boolean;
}

async function handleScheduled(env: Env): Promise<void> {
  if (!env.ALERT_EMAIL) return;

  const raw = await env.RATE_LIMIT_KV.get("config:alerts");
  if (!raw) return;
  let config: AlertsConfig;
  try {
    config = JSON.parse(raw) as AlertsConfig;
  } catch {
    return;
  }
  const email = config.email;
  const threshold = typeof config.thresholdPercent === "number" ? Math.min(100, Math.max(0, config.thresholdPercent)) : 80;
  const alertHour = config.alertHour !== false;
  const alertDay = config.alertDay !== false;
  if (!email || typeof email !== "string") return;

  const now = Date.now();
  const hour = hourKey(now);
  const day = dayKey(now);
  const limits = await getLimits(env);

  const [globalHourVal, globalDayVal] = await Promise.all([
    env.RATE_LIMIT_KV.get(`global:hour:${hour}`),
    env.RATE_LIMIT_KV.get(`global:day:${day}`),
  ]);
  const globalHourTokens = parseInt(globalHourVal ?? "0", 10);
  const globalDayTokens = parseInt(globalDayVal ?? "0", 10);

  const hourPct = limits.globalPerHour > 0 ? (globalHourTokens / limits.globalPerHour) * 100 : 0;
  const dayPct = limits.globalPerDay > 0 ? (globalDayTokens / limits.globalPerDay) * 100 : 0;

  const triggered: string[] = [];
  if (alertHour && hourPct >= threshold) triggered.push(`hour:${hour} (${hourPct.toFixed(1)}%)`);
  if (alertDay && dayPct >= threshold) triggered.push(`day:${day} (${dayPct.toFixed(1)}%)`);
  if (triggered.length === 0) return;

  const dedupeKeyHour = `alert:sent:hour:${hour}`;
  const dedupeKeyDay = `alert:sent:day:${day}`;
  const hourTriggered = alertHour && hourPct >= threshold;
  const dayTriggered = alertDay && dayPct >= threshold;
  const [sentHour, sentDay] = await Promise.all([
    hourTriggered ? env.RATE_LIMIT_KV.get(dedupeKeyHour) : null,
    dayTriggered ? env.RATE_LIMIT_KV.get(dedupeKeyDay) : null,
  ]);
  const needSend = (hourTriggered && sentHour === null) || (dayTriggered && sentDay === null);
  if (!needSend) return;

  const { EmailMessage } = await import("cloudflare:email");
  const { createMimeMessage } = await import("mimetext");
  const msg = createMimeMessage();
  msg.setSender({ name: "Tiles Rate Limit", addr: "alerts@tiles.local" });
  msg.setRecipient(email);
  msg.setSubject(`Rate limit threshold (${threshold}%) exceeded`);
  msg.addMessage({
    contentType: "text/plain",
    data: `Rate limit threshold (${threshold}%) exceeded:\n${triggered.join("\n")}\n\nHour: ${globalHourTokens}/${limits.globalPerHour} tokens\nDay: ${globalDayTokens}/${limits.globalPerDay} tokens`,
  });

  const message = new EmailMessage("alerts@tiles.local", email, msg.asRaw());
  await env.ALERT_EMAIL.send(message);

  const hourTtl = Math.floor(MS_PER_HOUR / 1000) + 3600;
  const dayTtl = Math.floor(MS_PER_DAY / 1000) + 86400;
  const puts: Promise<unknown>[] = [];
  if (alertHour && hourPct >= threshold) puts.push(env.RATE_LIMIT_KV.put(dedupeKeyHour, "1", { expirationTtl: hourTtl }));
  if (alertDay && dayPct >= threshold) puts.push(env.RATE_LIMIT_KV.put(dedupeKeyDay, "1", { expirationTtl: dayTtl }));
  await Promise.all(puts);
}
