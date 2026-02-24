/**
 * Tiles Worker — Cloudflare Worker AI proxy
 * Proxies LLM requests with CORS and rate limiting.
 */

const MODEL = "@cf/meta/llama-3.1-8b-instruct-awq" as const;

/** Allowed origins: GitHub Pages (*.github.io) and localhost for dev */
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-zA-Z0-9-]+\.github\.io(\/.*)?$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

/** Token limits (configurable via env) */
const DEFAULT_IP_PER_HOUR = 10_000;
const DEFAULT_GLOBAL_PER_HOUR = 100_000;
const DEFAULT_GLOBAL_PER_DAY = 500_000;

/** Conservative estimate for a single request (prompt + response) when checking limits */
const ESTIMATED_TOKENS_PER_REQUEST = 2000;

export interface Env {
  AI: Ai;
  RATE_LIMIT_KV: KVNamespace;
  ALLOWED_ORIGINS?: string;
  IP_PER_HOUR?: string;
  GLOBAL_PER_HOUR?: string;
  GLOBAL_PER_DAY?: string;
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

    if (url.pathname === "/generate" && request.method === "POST") {
      return handleGenerate(request, env, corsHeaders);
    }

    return jsonResponse({ error: "Not Found" }, 404, corsHeaders);
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

interface GenerateBody {
  fragmentA: string;
  fragmentB: string;
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

  const { fragmentA, fragmentB } = body;
  if (typeof fragmentA !== "string" || typeof fragmentB !== "string") {
    return jsonResponse(
      { error: "Missing or invalid fragmentA/fragmentB (must be strings)" },
      400,
      corsHeaders
    );
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const limits = {
    ipPerHour: parseInt(env.IP_PER_HOUR ?? "", 10) || DEFAULT_IP_PER_HOUR,
    globalPerHour: parseInt(env.GLOBAL_PER_HOUR ?? "", 10) || DEFAULT_GLOBAL_PER_HOUR,
    globalPerDay: parseInt(env.GLOBAL_PER_DAY ?? "", 10) || DEFAULT_GLOBAL_PER_DAY,
  };

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

  const prompt = buildMergePrompt(fragmentA, fragmentB);

  try {
    const response = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content: `You are an expert GLSL shader programmer. You combine fragment shaders into new, creative WebGL shaders. Output ONLY valid GLSL fragment shader code. Use the standard API: uniform float u_time; uniform vec2 u_resolution; uniform vec2 u_touch; in vec2 v_uv; out vec4 fragColor;`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
    });

    const result = response as { response?: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const generated = typeof result.response === "string" ? result.response : String(result?.response ?? "");
    const usage = result.usage;
    const tokensUsed = usage?.total_tokens ?? estimateTokens(prompt + generated);

    await incrementRateLimits(env.RATE_LIMIT_KV, ip, tokensUsed);

    return jsonResponse(
      {
        fragmentSource: generated.trim(),
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

function buildMergePrompt(fragmentA: string, fragmentB: string): string {
  return `Merge these two GLSL fragment shaders into one new shader that creatively combines their visual effects. Output ONLY the new fragment shader code, no explanations.

Shader A:
\`\`\`glsl
${fragmentA}
\`\`\`

Shader B:
\`\`\`glsl
${fragmentB}
\`\`\`

Output the merged fragment shader:`;
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
