# Merge Test Coverage Gaps (til-s37z)

Investigation of why merge failures in production are not caught by existing tests. Analyzes `merge.test.ts`, `merge.spec.ts`, and `drag-drop.test.ts`.

## Summary

The test suite has significant gaps: unit tests rely entirely on mocks that bypass real API and WebGL behavior; the E2E test only asserts the success path and depends on non-deterministic AI; drag-drop tests never exercise the merge flow end-to-end. Production merge failures can occur from API/network errors, AI returning invalid GLSL, or worker 502s—scenarios that are either untested or only partially covered.

---

## 1. merge.test.ts — Unit Tests

### What Is Tested

- Success when API returns `[VALID CODE]` (placeholder)
- Retry loop when API returns `[INVALID CODE]` (up to 3 attempts)
- Retry with `previousError` passed to API on second attempt
- API error response (e.g. rate limit) → toast and failure
- Fetch throws (e.g. "Failed to fetch") → toast and failure
- Shader structure and storage behavior
- No storage write when all retries fail

### Gaps

| Gap | Description |
|-----|-------------|
| **Mocks hide real API behavior** | `createMockFetchHarness` always returns `ok: true` with valid JSON. Never tests: malformed JSON, empty `fragmentSource`, `fragmentSource` not a string, or streaming/chunked responses. |
| **Placeholders bypass WebGL** | `[VALID CODE]` / `[INVALID CODE]` skip real shader compilation. Production uses actual GLSL; compilation can fail for reasons not represented by the placeholder (e.g. missing uniforms, wrong precision). |
| **No worker integration** | Fetch is fully mocked. No test hits the real `/generate` endpoint or validates request/response contract. |
| **Missing failure scenarios** | No test for: 502 from worker, timeout, CORS error, or response with `fragmentSource: ""`. |
| **No markdown-strip verification** | `stripMarkdownFences` in merge.ts is untested. If the worker returns markdown-wrapped GLSL, behavior depends on this function. |

---

## 2. merge.spec.ts — E2E Tests

### What Is Tested

- Single test: drag tile onto another → new tile with "Merge" in label appears
- Requires dev server + worker running (real network, real AI)

### Gaps

| Gap | Description |
|-----|-------------|
| **Success path only** | No E2E test for merge failure. When merge fails (toast, no new tile), there is no assertion that the loading tile is removed and the grid is restored. |
| **Non-deterministic AI** | Test depends on live LLM. If the AI returns invalid GLSL, the test fails—but that is flakiness, not a reliable regression check. |
| **No compilation verification** | Test checks for a tile with "Merge" in the label. It does not assert the tile compiles (no `.tile-error`). A bug could theoretically save a shader with a compile error and show a broken tile. |
| **Long timeout (30s)** | Suggests known latency/flakiness. Slow or flaky runs reduce confidence. |
| **No failure-path assertions** | If merge fails, we expect: loading tile removed, original tiles intact, toast shown. None of this is asserted in E2E. |
| **No API failure simulation** | Cannot simulate 502, rate limit, or network error in E2E to verify user-facing behavior. |

---

## 3. drag-drop.test.ts

### What Is Tested

- Teardown function, callback registration
- Drag preview creation/removal during pointer sequence
- Click suppression when dropping onto target (til-5585)

### Gaps

| Gap | Description |
|-----|-------------|
| **No merge flow integration** | `onMergeRequest` is mocked. No test verifies that a real merge handler is invoked with correct IDs or that the merge flow completes. |
| **elementFromPoint mocked** | The til-5585 test mocks `document.elementFromPoint` to simulate drop target. Real drop behavior (overlapping tiles, pointer-events) is not exercised. |
| **No end-to-end drag→merge** | Drag-drop and merge are tested in isolation. No test connects: pointer down → move → up → `onMergeRequest` → `performMerge` → DOM update. |

---

## 4. Production Failure Modes (Likely Causes)

Based on code review and architecture:

1. **AI returns invalid GLSL** — Despite retries, the model may return unfixable GLSL. User sees toast; tests do not deterministically reproduce this.
2. **Worker 502** — `env.AI.run` throws; worker returns 502. Frontend shows "Merge failed: AI generation failed". Unit test covers generic fetch error, but not 502 specifically.
3. **Rate limit (429)** — Unit test covers this with a mock. E2E does not.
4. **Network/CORS** — "Failed to fetch" or CORS errors. Unit test covers fetch throw. E2E does not.
5. **Malformed worker response** — Worker returns 200 but invalid JSON or missing `fragmentSource`. API throws; merge catches and shows toast. Not explicitly tested.
6. **DOM restoration on failure** — When merge fails, loading tile must be removed and original tiles restored. Logic exists in `main.ts`; no E2E asserts it.

---

## 5. Recommendations

1. **Add merge failure E2E** — Use a test mode or service worker to force API failure, then assert: loading tile removed, grid restored, toast visible.
2. **Add API contract tests** — Test `generateMerge` (or a thin wrapper) against a mock server that returns edge cases: empty body, malformed JSON, 502, 429.
3. **Add integration test with harness** — Run merge flow with `createMockFetchHarness` but without mocking `createShaderEngine`, using real placeholder logic. Ensures merge orchestration and storage behavior are correct.
4. **Document merge failure UX** — Clarify expected behavior (toast, no new tile, grid unchanged) so tests can assert it.
5. **Consider E2E stability** — Use a stable mock worker or fixture for E2E instead of live AI when possible, to reduce flakiness.

---

*Investigation for til-s37z. Last updated 2026-02-24.*
