/**
 * Cost calculation for Workers AI: neurons ↔ dollars, token→neuron estimates.
 * Used by ./rl cost. All pricing fetched live from Cloudflare APIs when available;
 * fallback to documented rates when API unavailable.
 */

export const NEURONS_PER_DOLLAR = 1000 / 0.011;
export const FREE_NEURONS_PER_DAY = 10_000;

/** Neurons per 1M tokens: [input, output]. Fallback when API pricing unavailable. */
export const FALLBACK_NEURONS_PER_M: Record<string, [number, number]> = {
  "@cf/meta/llama-3.1-8b-instruct-awq": [11161, 24215],
  "@cf/meta/llama-3.1-8b-instruct": [25608, 75147],
  "@cf/openai/whisper": [41.14, 41.14],
};

/** Cost in dollars for neurons above free tier. */
export function neuronsToCost(neurons: number): number {
  const billable = Math.max(0, neurons - FREE_NEURONS_PER_DAY);
  return billable / NEURONS_PER_DOLLAR;
}

/** Estimate neurons from tokens (output-heavy split ~30% input, 70% output). */
export function tokensToNeurons(
  tokens: number,
  modelId: string,
  rates?: [number, number] | null
): number {
  const [inRate, outRate] = rates ?? FALLBACK_NEURONS_PER_M[modelId] ?? [15000, 30000];
  const inputTokens = Math.floor(tokens * 0.3);
  const outputTokens = tokens - inputTokens;
  return (inputTokens / 1e6) * inRate + (outputTokens / 1e6) * outRate;
}

export type ModelPricing = Record<string, [number, number]>;

/**
 * Attempt to fetch per-model neuron rates from Cloudflare API.
 * Returns null when API unavailable (no pricing endpoint exists yet).
 */
export async function fetchModelPricing(
  _cfToken: string,
  _cfAccountId: string
): Promise<ModelPricing | null> {
  // Cloudflare does not yet expose a public pricing API for per-model neuron rates.
  // When available, fetch from API here. For now return null → caller shows raw tokens.
  return null;
}
