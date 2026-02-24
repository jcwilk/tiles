/**
 * Placeholder validation for shader tests.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] to mock shader
 * compilation in tests, avoiding real GPU execution.
 */
import { describe, it, expect } from "vitest";

const VALID_PLACEHOLDER = "[VALID CODE]";
const INVALID_PLACEHOLDER = "[INVALID CODE]";

function isPlaceholderCode(code: string): boolean {
  return code === VALID_PLACEHOLDER || code === INVALID_PLACEHOLDER;
}

function wouldCompile(code: string): boolean {
  if (code === VALID_PLACEHOLDER) return true;
  if (code === INVALID_PLACEHOLDER) return false;
  return false;
}

describe("shader placeholder validation", () => {
  it("recognizes valid placeholder", () => {
    expect(isPlaceholderCode("[VALID CODE]")).toBe(true);
    expect(wouldCompile("[VALID CODE]")).toBe(true);
  });

  it("recognizes invalid placeholder", () => {
    expect(isPlaceholderCode("[INVALID CODE]")).toBe(true);
    expect(wouldCompile("[INVALID CODE]")).toBe(false);
  });

  it("rejects non-placeholder code in test mode", () => {
    expect(isPlaceholderCode("void main() {}")).toBe(false);
  });
});
