/**
 * Tests for shared validation context.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders
 * to avoid real WebGL in CI (jsdom has no WebGL2).
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  compileCheck,
  disposeValidationContext,
  type CompileCheckResult,
} from "./validation-context.js";
import { VALID_CODE, INVALID_CODE } from "./test-harness.js";

describe("validation-context", () => {
  afterEach(() => {
    disposeValidationContext();
  });

  it("returns ok for [VALID CODE] placeholder", () => {
    const result = compileCheck(VALID_CODE);
    expect(result.ok).toBe(true);
    expect(result.compileError).toBeUndefined();
    expect(result.linkError).toBeUndefined();
  });

  it("returns not ok for [INVALID CODE] placeholder", () => {
    const result = compileCheck(INVALID_CODE);
    expect(result.ok).toBe(false);
    expect(result.compileError).toBe(INVALID_CODE);
  });

  it("reuses context across multiple compileCheck calls", () => {
    const r1 = compileCheck(VALID_CODE);
    const r2 = compileCheck(VALID_CODE);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it("disposeValidationContext allows subsequent compileCheck", () => {
    const r1 = compileCheck(VALID_CODE);
    expect(r1.ok).toBe(true);

    disposeValidationContext();
    const r2 = compileCheck(VALID_CODE);
    expect(r2.ok).toBe(true);
  });

  it("accepts custom vertex source", () => {
    const customVertex = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
    const result = compileCheck(VALID_CODE, customVertex);
    expect(result.ok).toBe(true);
  });

  it("returns consistent result shape for placeholders", () => {
    const validResult: CompileCheckResult = compileCheck(VALID_CODE);
    expect(validResult).toHaveProperty("ok", true);

    const invalidResult: CompileCheckResult = compileCheck(INVALID_CODE);
    expect(invalidResult).toHaveProperty("ok", false);
    expect(invalidResult).toHaveProperty("compileError");
  });
});
