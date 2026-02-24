/**
 * Prompt evaluation utilities: input hashing for staleness detection.
 * Used by prompt-eval tests; not part of npm test.
 */
import { createHash } from "node:crypto";
import { buildMergePrompt } from "./index.js";

/** Prompt template fingerprint; changes when buildMergePrompt changes */
const PROMPT_TEMPLATE_FINGERPRINT = (() => {
  const base = buildMergePrompt("", "", undefined);
  return createHash("sha256").update(base).digest("hex").slice(0, 16);
})();

/**
 * Compute hash of inputs for staleness detection.
 * Hash includes fragmentA, fragmentB, previousError, and prompt template.
 */
export function computeInputHash(
  fragmentA: string,
  fragmentB: string,
  previousError: string | null | undefined
): string {
  const err = previousError ?? "";
  const payload = `${fragmentA}\0${fragmentB}\0${err}\0${PROMPT_TEMPLATE_FINGERPRINT}`;
  return createHash("sha256").update(payload).digest("hex");
}
