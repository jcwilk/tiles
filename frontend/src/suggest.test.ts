/**
 * Suggestion logic tests: parallel requests, callback delivery.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchSuggestions } from "./suggest.js";

vi.mock("./toast.js", () => ({
  showToast: vi.fn(),
}));

describe("fetchSuggestions", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fires 3 parallel requests with different adventurousness tiers", async () => {
    const calls: { body: { adventurousness: string } }[] = [];
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      calls.push({ body });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ suggestion: `suggestion-${body.adventurousness}` }),
      } as Response);
    }) as typeof fetch;

    const received: [string, string][] = [];
    await fetchSuggestions("void main(){}", (tier, suggestion) => {
      received.push([tier, suggestion]);
    });

    expect(calls).toHaveLength(3);
    const tiers = calls.map((c) => c.body.adventurousness).sort();
    expect(tiers).toEqual(["conservative", "moderate", "wild"]);
    expect(received).toHaveLength(3);
    expect(received.map(([t, s]) => [t, s]).sort((a, b) => a[0].localeCompare(b[0]))).toEqual([
      ["conservative", "suggestion-conservative"],
      ["moderate", "suggestion-moderate"],
      ["wild", "suggestion-wild"],
    ]);
  });

  it("delivers each suggestion via callback as it resolves", async () => {
    const delays: Record<string, number> = {
      conservative: 0,
      moderate: 20,
      wild: 40,
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

    const order: string[] = [];
    await fetchSuggestions("void main(){}", (tier) => {
      order.push(tier);
    });

    expect(order).toContain("conservative");
    expect(order).toContain("moderate");
    expect(order).toContain("wild");
    expect(order).toHaveLength(3);
  });

  it("shows toast and skips failed suggestion", async () => {
    globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? "{}");
      if (body.adventurousness === "moderate") {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Rate limit exceeded" }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ suggestion: body.adventurousness }),
      } as Response);
    }) as typeof fetch;

    const received: [string, string][] = [];
    await fetchSuggestions("void main(){}", (tier, suggestion) => {
      received.push([tier, suggestion]);
    });

    expect(received).toHaveLength(2);
    expect(received.map(([t]) => t).sort()).toEqual(["conservative", "wild"]);

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("moderate"));
  });
});
