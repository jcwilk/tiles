import { describe, it, expect } from "vitest";
import {
  neuronsToCost,
  tokensToNeurons,
  NEURONS_PER_DOLLAR,
  FREE_NEURONS_PER_DAY,
  FALLBACK_NEURONS_PER_M,
} from "./cost";

describe("neuronsToCost", () => {
  it("returns 0 for neurons at or below free tier", () => {
    expect(neuronsToCost(0)).toBe(0);
    expect(neuronsToCost(5000)).toBe(0);
    expect(neuronsToCost(FREE_NEURONS_PER_DAY)).toBe(0);
  });

  it("subtracts free tier before converting to dollars", () => {
    const neurons = FREE_NEURONS_PER_DAY + 1000;
    const expected = 1000 / NEURONS_PER_DOLLAR;
    expect(neuronsToCost(neurons)).toBeCloseTo(expected, 6);
  });

  it("converts at $0.011 per 1000 neurons", () => {
    const neurons = 1000;
    const cost = neuronsToCost(FREE_NEURONS_PER_DAY + neurons);
    expect(cost).toBeCloseTo(0.011, 6);
  });
});

describe("tokensToNeurons", () => {
  it("uses output-heavy split (30% input, 70% output)", () => {
    const rates: [number, number] = [10000, 30000];
    const tokens = 1_000_000;
    const neurons = tokensToNeurons(tokens, "test-model", rates);
    const inputTokens = 300_000;
    const outputTokens = 700_000;
    const expected = (inputTokens / 1e6) * 10000 + (outputTokens / 1e6) * 30000;
    expect(neurons).toBeCloseTo(expected, 2);
  });

  it("uses fallback rates for known models when rates not provided", () => {
    const modelId = "@cf/meta/llama-3.1-8b-instruct-awq";
    const neurons = tokensToNeurons(1_000_000, modelId, null);
    const [inRate, outRate] = FALLBACK_NEURONS_PER_M[modelId];
    const expected = 0.3 * inRate + 0.7 * outRate;
    expect(neurons).toBeCloseTo(expected, 2);
  });

  it("uses default rates for unknown models when rates not provided", () => {
    const neurons = tokensToNeurons(1_000_000, "unknown-model", null);
    const expected = 0.3 * 15000 + 0.7 * 30000;
    expect(neurons).toBeCloseTo(expected, 2);
  });
});
