import { describe, it, expect } from "vitest";
import { isBuiltInTile } from "./builtin.js";

describe("main", () => {
  it("smoke test", () => {
    expect(true).toBe(true);
  });
});

describe("isBuiltInTile", () => {
  it("returns true for seed shader ids", () => {
    expect(isBuiltInTile("seed-0-123")).toBe(true);
    expect(isBuiltInTile("seed-5-999")).toBe(true);
    expect(isBuiltInTile("seed-0-1708761600000")).toBe(true);
  });

  it("returns false for user-created and merged tiles", () => {
    expect(isBuiltInTile("merge-abc")).toBe(false);
    expect(isBuiltInTile("voice-xyz")).toBe(false);
    expect(isBuiltInTile("custom-123")).toBe(false);
  });
});
