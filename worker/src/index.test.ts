import { describe, it, expect, vi } from "vitest";
import worker from "./index.js";
import type { Env } from "./index.js";

function createMockKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: vi.fn(() => Promise.resolve()),
    list: vi.fn(() => Promise.resolve({ keys: [], list_complete: true })),
  } as unknown as KVNamespace;
}

function createMockAI(response: string, tokens = 100): Ai {
  return {
    run: vi.fn(() =>
      Promise.resolve({
        response,
        usage: { prompt_tokens: 50, completion_tokens: tokens, total_tokens: 50 + tokens },
      })
    ),
  } as unknown as Ai;
}

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    AI: createMockAI("[VALID CODE]"),
    RATE_LIMIT_KV: createMockKV(),
    ...overrides,
  };
}

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
});
