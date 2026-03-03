/**
 * Prompt evaluation utilities: input hashing for staleness detection.
 * Used by prompt-eval tests; not part of npm test.
 */
import { createHash } from "node:crypto";
import { buildApplyDirectiveUserMessage } from "./index.js";

export const PROMPT_EVAL_DIRECTIVE =
  "Blend the MAIN SHADER with visual ideas from the REFERENCE SHADER while preserving valid WebGL GLSL output.";

/** Prompt template fingerprint; changes when apply-directive prompt template changes */
const PROMPT_TEMPLATE_FINGERPRINT = (() => {
  const base = buildApplyDirectiveUserMessage("", PROMPT_EVAL_DIRECTIVE, [""], undefined);
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
