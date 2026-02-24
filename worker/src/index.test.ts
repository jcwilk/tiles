import { describe, it, expect, vi } from "vitest";

vi.mock("cloudflare:email", () => ({
  EmailMessage: class MockEmailMessage {
    constructor() {}
  },
}));
vi.mock("mimetext", () => ({
  createMimeMessage: () => ({
    setSender: () => {},
    setRecipient: () => {},
    setSubject: () => {},
    addMessage: () => {},
    asRaw: () => "MIME-raw",
  }),
}));

import worker, { sanitizeGLSL, getLimits } from "./index.js";
import type { Env } from "./index.js";

function createMockKV(initial?: Map<string, string>): KVNamespace & { store: Map<string, string> } {
  const store = new Map<string, string>(initial);
  return {
    store,
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    list: vi.fn(() => Promise.resolve({ keys: [], list_complete: true })),
  } as unknown as KVNamespace & { store: Map<string, string> };
}

const WHISPER_MODEL = "@cf/openai/whisper";

function createMockAI(response: string, tokens = 100): Ai {
  return {
    run: vi.fn((model: string) => {
      if (model === WHISPER_MODEL) {
        return Promise.resolve({ text: "transcribed shader description" });
      }
      return Promise.resolve({
        response,
        usage: { prompt_tokens: 50, completion_tokens: tokens, total_tokens: 50 + tokens },
      });
    }),
  } as unknown as Ai;
}

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    AI: createMockAI("[VALID CODE]"),
    RATE_LIMIT_KV: createMockKV(),
    ...overrides,
  };
}

describe("sanitizeGLSL", () => {
  it("strips markdown fences and extracts GLSL", () => {
    const input = "```glsl\n#version 300 es\nprecision highp float;\nvoid main(){}\n```";
    expect(sanitizeGLSL(input)).toContain("#version 300 es");
    expect(sanitizeGLSL(input)).toContain("void main(){}");
    expect(sanitizeGLSL(input)).not.toContain("```");
  });

  it("prepends #version 300 es when missing", () => {
    const input = "precision highp float;\nvoid main(){ fragColor=vec4(1); }";
    const out = sanitizeGLSL(input);
    expect(out).toMatch(/^#version\s+300\s+es/);
    expect(out).toContain("void main()");
  });

  it("inserts precision highp float when missing", () => {
    const input = "#version 300 es\nvoid main(){ fragColor=vec4(1); }";
    const out = sanitizeGLSL(input);
    expect(out).toContain("precision highp float;");
    expect(out).toContain("void main()");
  });

  it("leaves clean input unchanged", () => {
    const input = `#version 300 es
precision highp float;
uniform float u_time;
void main(){ fragColor=vec4(1); }`;
    const out = sanitizeGLSL(input);
    expect(out).toBe(input);
  });

  it("strips prose before #version", () => {
    const input = "Here is the shader:\n\n#version 300 es\nprecision highp float;\nvoid main(){}";
    const out = sanitizeGLSL(input);
    expect(out).toMatch(/^#version\s+300\s+es/);
    expect(out).not.toContain("Here is the shader");
  });

  it("passes through test placeholders unchanged", () => {
    expect(sanitizeGLSL("[VALID CODE]")).toBe("[VALID CODE]");
    expect(sanitizeGLSL("[INVALID CODE]")).toBe("[INVALID CODE]");
  });
});

describe("worker", () => {
  it("smoke test", () => {
    expect(true).toBe(true);
  });

  describe("GET /health", () => {
    it("returns 200 with status ok", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/health");
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ status: "ok" });
    });
  });

  describe("OPTIONS (CORS preflight)", () => {
    it("returns 204 for allowed origin", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/", {
        method: "OPTIONS",
        headers: { Origin: "https://user.github.io" },
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://user.github.io");
    });

    it("returns 204 for localhost origin", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:5173" },
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
    });
  });

  describe("POST /generate", () => {
    it("rejects request without allowed origin", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/generate", {
        method: "POST",
        headers: { Origin: "https://evil.com", "Content-Type": "application/json" },
        body: JSON.stringify({ fragmentA: "void main(){}", fragmentB: "void main(){}" }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("origin not allowed");
    });

    it("rejects invalid JSON body", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/generate", {
        method: "POST",
        headers: { Origin: "https://user.github.io", "Content-Type": "application/json" },
        body: "not json",
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("Invalid JSON");
    });

    it("rejects missing fragmentA or fragmentB", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/generate", {
        method: "POST",
        headers: { Origin: "https://user.github.io", "Content-Type": "application/json" },
        body: JSON.stringify({ fragmentA: "x" }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("fragmentA/fragmentB");
    });

    it("returns generated shader for valid request with allowed origin", async () => {
      const mockAI = createMockAI("[VALID CODE]");
      const env = createEnv({ AI: mockAI });
      const req = new Request("http://localhost/generate", {
        method: "POST",
        headers: {
          Origin: "https://user.github.io",
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({
          fragmentA: "void main(){ fragColor=vec4(1,0,0,1); }",
          fragmentB: "void main(){ fragColor=vec4(0,1,0,1); }",
        }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { fragmentSource: string; tokensUsed: number };
      expect(body.fragmentSource).toBe("[VALID CODE]");
      expect(typeof body.tokensUsed).toBe("number");
      expect(env.AI.run).toHaveBeenCalled();
    });

    it("returns [INVALID CODE] when mock AI is configured for invalid output", async () => {
      const mockAI = createMockAI("[INVALID CODE]");
      const env = createEnv({ AI: mockAI });
      const req = new Request("http://localhost/generate", {
        method: "POST",
        headers: {
          Origin: "https://user.github.io",
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({
          fragmentA: "void main(){}",
          fragmentB: "void main(){}",
        }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { fragmentSource: string };
      expect(body.fragmentSource).toBe("[INVALID CODE]");
    });

    it("accepts optional previousError for retry context", async () => {
      const mockAI = createMockAI("[VALID CODE]");
      const env = createEnv({ AI: mockAI });
      const req = new Request("http://localhost/generate", {
        method: "POST",
        headers: {
          Origin: "https://user.github.io",
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({
          fragmentA: "void main(){}",
          fragmentB: "void main(){}",
          previousError: "Fragment: syntax error at line 5",
        }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { fragmentSource: string };
      expect(body.fragmentSource).toBe("[VALID CODE]");
      expect(env.AI.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("syntax error at line 5"),
            }),
          ]),
        })
      );
    });

    it("honors ALLOWED_ORIGINS env override", async () => {
      const env = createEnv({ ALLOWED_ORIGINS: "https://custom.example.com" });
      const req = new Request("http://localhost/generate", {
        method: "POST",
        headers: {
          Origin: "https://custom.example.com",
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({ fragmentA: "x", fragmentB: "y" }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /transcribe", () => {
    it("rejects request without allowed origin", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/transcribe", {
        method: "POST",
        headers: { Origin: "https://evil.com", "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: btoa("fake-audio") }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(403);
    });

    it("rejects missing or invalid audioBase64", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/transcribe", {
        method: "POST",
        headers: { Origin: "https://user.github.io", "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("audioBase64");
    });

    it("returns transcription for valid audio", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/transcribe", {
        method: "POST",
        headers: { Origin: "https://user.github.io", "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: btoa("fake-audio-bytes") }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { text: string };
      expect(body.text).toBe("transcribed shader description");
      expect(env.AI.run).toHaveBeenCalledWith(
        WHISPER_MODEL,
        expect.objectContaining({ audio: expect.any(Array) })
      );
    });
  });

  describe("POST /generate-from-prompt", () => {
    it("rejects request without allowed origin", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/generate-from-prompt", {
        method: "POST",
        headers: { Origin: "https://evil.com", "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "blue gradient" }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(403);
    });

    it("rejects missing or invalid prompt", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/generate-from-prompt", {
        method: "POST",
        headers: { Origin: "https://user.github.io", "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain("prompt");
    });

    it("returns generated shader for valid prompt", async () => {
      const mockAI = createMockAI("[VALID CODE]");
      const env = createEnv({ AI: mockAI });
      const req = new Request("http://localhost/generate-from-prompt", {
        method: "POST",
        headers: {
          Origin: "https://user.github.io",
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({ prompt: "a blue gradient shader" }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { fragmentSource: string; tokensUsed: number };
      expect(body.fragmentSource).toBe("[VALID CODE]");
      expect(typeof body.tokensUsed).toBe("number");
    });

    it("accepts optional previousError for retry context", async () => {
      const mockAI = createMockAI("[VALID CODE]");
      const env = createEnv({ AI: mockAI });
      const req = new Request("http://localhost/generate-from-prompt", {
        method: "POST",
        headers: {
          Origin: "https://user.github.io",
          "Content-Type": "application/json",
          "CF-Connecting-IP": "1.2.3.4",
        },
        body: JSON.stringify({
          prompt: "blue gradient",
          previousError: "syntax error at line 5",
        }),
      });
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      expect(env.AI.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("syntax error at line 5"),
            }),
          ]),
        })
      );
    });
  });

  describe("404", () => {
    it("returns 404 for unknown path", async () => {
      const env = createEnv();
      const req = new Request("http://localhost/unknown");
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Not Found");
    });
  });

  describe("GET /usage", () => {
    it("returns correct shape with hour, day, and limits", async () => {
      const now = Date.now();
      const hourKey = new Date(now).toISOString().slice(0, 13);
      const dayKey = new Date(now).toISOString().slice(0, 10);
      const kv = createMockKV(
        new Map([
          [`global:hour:${hourKey}`, "5000"],
          [`global:day:${dayKey}`, "25000"],
        ])
      );
      const env = createEnv({ RATE_LIMIT_KV: kv });
      const req = new Request("http://localhost/usage");
      const res = await worker.fetch(req, env, {} as ExecutionContext);
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        hour: { key: string; globalTokens: number; limit: number };
        day: { key: string; globalTokens: number; limit: number };
        limits: { ipPerHour: number; globalPerHour: number; globalPerDay: number };
      };
      expect(body.hour).toBeDefined();
      expect(body.hour.key).toBe(hourKey);
      expect(body.hour.globalTokens).toBe(5000);
      expect(typeof body.hour.limit).toBe("number");
      expect(body.day).toBeDefined();
      expect(body.day.key).toBe(dayKey);
      expect(body.day.globalTokens).toBe(25000);
      expect(typeof body.day.limit).toBe("number");
      expect(body.limits).toBeDefined();
      expect(typeof body.limits.ipPerHour).toBe("number");
      expect(typeof body.limits.globalPerHour).toBe("number");
      expect(typeof body.limits.globalPerDay).toBe("number");
    });
  });
});

describe("getLimits", () => {
  it("returns env values when KV has no config:limits", async () => {
    const env = createEnv({ IP_PER_HOUR: "5000", GLOBAL_PER_HOUR: "50000", GLOBAL_PER_DAY: "200000" });
    const limits = await getLimits(env);
    expect(limits.ipPerHour).toBe(5000);
    expect(limits.globalPerHour).toBe(50000);
    expect(limits.globalPerDay).toBe(200000);
  });

  it("returns KV overrides when config:limits exists", async () => {
    const kv = createMockKV(new Map([["config:limits", '{"ipPerHour":1111,"globalPerHour":22222,"globalPerDay":333333}']]));
    const env = createEnv({ RATE_LIMIT_KV: kv });
    const limits = await getLimits(env);
    expect(limits.ipPerHour).toBe(1111);
    expect(limits.globalPerHour).toBe(22222);
    expect(limits.globalPerDay).toBe(333333);
  });

  it("falls back to env for missing KV fields", async () => {
    const kv = createMockKV(new Map([["config:limits", '{"globalPerHour":99999}']]));
    const env = createEnv({ RATE_LIMIT_KV: kv, IP_PER_HOUR: "5000", GLOBAL_PER_DAY: "200000" });
    const limits = await getLimits(env);
    expect(limits.ipPerHour).toBe(5000);
    expect(limits.globalPerHour).toBe(99999);
    expect(limits.globalPerDay).toBe(200000);
  });
});

describe("scheduled handler", () => {
  it("does nothing when ALERT_EMAIL is missing", async () => {
    const kv = createMockKV(new Map([["config:alerts", '{"email":"a@b.com","thresholdPercent":80}']]));
    const env = createEnv({ RATE_LIMIT_KV: kv });
    const ctx = { waitUntil: vi.fn((p: Promise<unknown>) => p) } as unknown as ExecutionContext;
    const event = { cron: "*/15 * * * *", scheduledTime: Date.now() } as ScheduledEvent;
    await worker.scheduled(event, env, ctx);
    expect(ctx.waitUntil).toHaveBeenCalled();
  });

  it("sends alert when threshold exceeded and deduplicates", async () => {
    const now = Date.now();
    const hourKey = new Date(now).toISOString().slice(0, 13);
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const kv = createMockKV(
      new Map([
        ["config:alerts", '{"email":"admin@example.com","thresholdPercent":50,"alertHour":true,"alertDay":true}'],
        [`global:hour:${hourKey}`, "60000"],
        [`global:day:${dayKey}`, "300000"],
      ])
    );
    const mockSend = vi.fn(() => Promise.resolve({ messageId: "msg-1" }));
    const env = createEnv({
      RATE_LIMIT_KV: kv,
      ALERT_EMAIL: { send: mockSend } as unknown as SendEmail,
    });
    const ctx = { waitUntil: vi.fn((p: Promise<unknown>) => p.then(() => {})) } as unknown as ExecutionContext;
    const event = { cron: "*/15 * * * *", scheduledTime: now } as ScheduledEvent;
    await worker.scheduled(event, env, ctx);
    await (ctx.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(kv.store.get(`alert:sent:hour:${hourKey}`)).toBe("1");
    expect(kv.store.get(`alert:sent:day:${dayKey}`)).toBe("1");
  });

  it("respects per-tier config (alertDay false)", async () => {
    const now = Date.now();
    const hourKey = new Date(now).toISOString().slice(0, 13);
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const kv = createMockKV(
      new Map([
        ["config:alerts", '{"email":"a@b.com","thresholdPercent":50,"alertHour":true,"alertDay":false}'],
        [`global:hour:${hourKey}`, "60000"],
        [`global:day:${dayKey}`, "300000"],
      ])
    );
    const mockSend = vi.fn(() => Promise.resolve({ messageId: "msg-1" }));
    const env = createEnv({
      RATE_LIMIT_KV: kv,
      ALERT_EMAIL: { send: mockSend } as unknown as SendEmail,
    });
    const ctx = { waitUntil: vi.fn((p: Promise<unknown>) => p.then(() => {})) } as unknown as ExecutionContext;
    await worker.scheduled({ cron: "*/15 * * * *", scheduledTime: now } as ScheduledEvent, env, ctx);
    await (ctx.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(kv.store.get(`alert:sent:hour:${hourKey}`)).toBe("1");
    expect(kv.store.get(`alert:sent:day:${dayKey}`)).toBeUndefined();
  });

  it("does not send when already deduplicated", async () => {
    const now = Date.now();
    const hourKey = new Date(now).toISOString().slice(0, 13);
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const kv = createMockKV(
      new Map([
        ["config:alerts", '{"email":"a@b.com","thresholdPercent":50}'],
        [`global:hour:${hourKey}`, "60000"],
        [`global:day:${dayKey}`, "300000"],
        [`alert:sent:hour:${hourKey}`, "1"],
        [`alert:sent:day:${dayKey}`, "1"],
      ])
    );
    const mockSend = vi.fn(() => Promise.resolve({ messageId: "msg-1" }));
    const env = createEnv({
      RATE_LIMIT_KV: kv,
      ALERT_EMAIL: { send: mockSend } as unknown as SendEmail,
    });
    const ctx = { waitUntil: vi.fn((p: Promise<unknown>) => p.then(() => {})) } as unknown as ExecutionContext;
    await worker.scheduled({ cron: "*/15 * * * *", scheduledTime: now } as ScheduledEvent, env, ctx);
    await (ctx.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(mockSend).not.toHaveBeenCalled();
  });
});
