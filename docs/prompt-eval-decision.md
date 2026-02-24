# Prompt Evaluation Tooling — Research Decision

**Ticket**: til-hxs3  
**Date**: 2026-02-23  
**Status**: Decision documented; approach chosen for implementation (til-442l).

---

## Summary

Research evaluated **promptfoo** (open-source eval framework), a **custom Vitest approach**, and **fixture staleness detection patterns**. The decision is to **roll a lightweight custom Vitest-based prompt eval** with fixture recording, staleness detection, and a structural GLSL validator.

---

## Research Findings

### 1. Promptfoo

- **What it is**: Open-source CLI and library for LLM evaluation. Supports multiple providers, YAML config, assertions (string match, JavaScript, LLM rubric), caching, and CI integration.
- **Cloudflare support**: Has `cloudflare-ai:chat:@cf/meta/llama-3.1-8b-instruct-awq` provider. Uses Cloudflare’s OpenAI-compatible HTTP API directly.
- **Vitest integration**: Custom matchers (`toMatchSemanticSimilarity`, `toPassLLMRubric`, etc.) via `installMatchers()`.
- **Assertions**: JavaScript assertions can validate arbitrary output (e.g. GLSL structure).
- **Limitations for Tiles**:
  - Calls Cloudflare API directly, not our Worker. Our Worker has its own system prompt, `buildMergePrompt`, and `sanitizeGLSL`. To test the full stack we’d need a custom HTTP provider pointing at our `/generate` endpoint.
  - No built-in fixture staleness detection. Caching is for API responses, not “prompt/inputs changed → fixtures invalid.”
  - Oriented toward prompt A/B testing and multi-provider comparison; we have a single prompt and single model.
  - Adds a dependency and config surface for a narrow use case.

### 2. Custom Vitest Approach

- **What it is**: Vitest tests that call the Worker (or its logic) with real or mocked AI, record outputs to fixtures, and validate them.
- **Fit**: Matches the til-442l design (gated live tests, fixture recording, staleness detection, re-record command, structural validator).
- **Advantages**:
  - Tests the real Worker endpoint (prompt + sanitizeGLSL).
  - Full control over fixture format and staleness logic.
  - No new dependencies; Vitest is already used.
  - Keeps eval logic in the worker package.

### 3. Fixture Staleness Detection

- **Pattern**: Hash the inputs that determine the output. If the hash changes, fixtures are stale.
- **For Tiles**: Inputs are `fragmentA`, `fragmentB`, `previousError`, and the prompt template (system + user). The effective input set is `(fragmentA, fragmentB, previousError)` plus the prompt text from `buildMergePrompt` (which is deterministic given those args).
- **Mechanism**: `hash(fragmentA + fragmentB + (previousError ?? '') + promptTemplateVersion)` or similar. Store hash in fixture metadata. On run, recompute hash; if it differs, fail with a clear “Run `npm run re-record` to update fixtures” message.

---

## Decision

### (a) Use existing framework or roll lightweight one?

**Roll a lightweight custom Vitest-based eval.**

Reasons:

1. til-442l already specifies the design; a custom approach implements it directly.
2. We need to test the full Worker (prompt + sanitizeGLSL), not just raw prompt→LLM.
3. Staleness detection is central; promptfoo does not provide it.
4. Single prompt and model; promptfoo’s multi-prompt/provider features add complexity without clear benefit.
5. Fewer dependencies and simpler integration with the existing Vitest setup.

### (b) Staleness detection mechanism

**Hash-based staleness detection.**

- **Inputs to hash**: `fragmentA`, `fragmentB`, `previousError` (or empty string), and a prompt template version (e.g. a constant or hash of the prompt-building logic).
- **Storage**: Store `inputHash` in each fixture’s metadata.
- **On run**: Compute current hash from the same inputs. If `currentHash !== fixture.inputHash`, fail with a message like: `Fixture stale: prompt or inputs changed. Run 'npm run test:eval -- --record' to re-record.`
- **Implementation**: Use a fast hash (e.g. `crypto.createHash('sha256')` in Node, or a simple string hash for fixtures). No need for crypto-grade security.

### (c) Fixture storage format

**JSON files in `worker/src/__fixtures__/`.**

- **Structure** (per fixture file or per test case):

  ```json
  {
    "inputHash": "sha256:abc123...",
    "fragmentA": "...",
    "fragmentB": "...",
    "previousError": null,
    "output": "...",
    "recordedAt": "2026-02-23T12:00:00Z"
  }
  ```

- **Naming**: One file per test case (e.g. `gradient-plasma.json`, `noise-circles.json`, `stripes-rainbow.json`) or a single `prompt-eval.json` with an array of cases.
- **Source data**: Use canned pairs from `seed-shaders.ts`: Gradient+Plasma, Noise+Circles, Stripes+Rainbow (per til-442l).

---

## Implementation Approach (for til-442l)

1. **Gated live tests**: Only run when `PROMPT_EVAL=1` (or similar). Never included in `npm test`; use `npm run test:eval` or `test:eval:record`.
2. **Fixture recording**: `worker/src/__fixtures__/` with JSON format above.
3. **Staleness detection**: Hash `fragmentA + fragmentB + (previousError ?? '') + PROMPT_VERSION`; compare to `inputHash` in fixture; fail with re-record instructions if stale.
4. **Re-record command**: `npm run test:eval -- --record` (or `PROMPT_EVAL_RECORD=1 npm run test:eval`).
5. **Structural GLSL validator**: Assert that output has `#version 300 es`, `precision highp float`, required uniforms (`u_time`, `u_resolution`, `u_touch`), `main()`, and balanced braces. Can be a small pure function used by both eval and unit tests.
6. **Documentation**: Add a short workflow section (e.g. in `docs/README.md` or a dedicated doc) describing how to run, record, and interpret eval results.

---

## References

- [Promptfoo intro](https://promptfoo.dev/docs/intro)
- [Promptfoo Cloudflare AI provider](https://www.promptfoo.dev/docs/providers/cloudflare-ai)
- [Promptfoo JavaScript assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/javascript)
- [Promptfoo Vitest integration](https://www.promptfoo.dev/docs/integrations/jest)
- [vitest-evals](https://github.com/getsentry/vitest-evals) (alternative; not chosen)
- til-442l: Implement prompt evaluation tests
- til-joj6: Improve AI merge prompt
- `worker/src/index.ts`: `buildMergePrompt`, `sanitizeGLSL`
- `frontend/src/seed-shaders.ts`: Canned shader pairs

---

*Last Updated: 2026-02-23*
