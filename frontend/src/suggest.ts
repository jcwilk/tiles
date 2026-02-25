/**
 * Suggestion logic: fire 3 parallel /suggest requests with different adventurousness tiers.
 * Each suggestion delivered via callback as it resolves.
 */
import { fetchSuggestion, type Adventurousness } from "./api.js";
import { showToast } from "./toast.js";

const TIERS: Adventurousness[] = ["conservative", "moderate", "wild"];

/**
 * Fetch suggestions for all three adventurousness tiers in parallel.
 * onSuggestion fires as each tier completes. Errors are handled gracefully
 * (toast for failures, skip that suggestion).
 */
export async function fetchSuggestions(
  fragmentSource: string,
  onSuggestion: (tier: string, suggestion: string) => void
): Promise<void> {
  const promises = TIERS.map(async (tier) => {
    try {
      const { suggestion } = await fetchSuggestion(fragmentSource, tier);
      onSuggestion(tier, suggestion);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showToast(`Suggestion (${tier}) failed: ${message}`);
    }
  });

  await Promise.all(promises);
}
