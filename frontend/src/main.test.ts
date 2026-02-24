import { describe, it, expect } from "vitest";
import { isBuiltInTile } from "./builtin.js";

describe("main", () => {
  it("smoke test", () => {
    expect(true).toBe(true);
  });
});

function shader(id: string, name: string): { id: string; name: string } {
  return { id, name };
}

describe("isBuiltInTile", () => {
  it("returns true for seed shaders still in current defaults", () => {
    expect(isBuiltInTile(shader("seed-0-123", "Gradient"))).toBe(true);
    expect(isBuiltInTile(shader("seed-5-999", "Rainbow"))).toBe(true);
    expect(isBuiltInTile(shader("seed-0-1708761600000", "Gradient"))).toBe(true);
  });

  it("returns false for obsolete seeds (name no longer in defaults)", () => {
    expect(isBuiltInTile(shader("seed-4-123", "Obsolete"))).toBe(false);
    expect(isBuiltInTile(shader("seed-0-999", "RemovedSeed"))).toBe(false);
  });

  it("returns false for user-created and merged tiles", () => {
    expect(isBuiltInTile(shader("merge-abc", "Merged"))).toBe(false);
    expect(isBuiltInTile(shader("voice-xyz", "Voice"))).toBe(false);
    expect(isBuiltInTile(shader("custom-123", "Custom"))).toBe(false);
  });
});
