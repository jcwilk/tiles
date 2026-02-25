/**
 * Ordering utility tests.
 */
import { describe, it, expect } from "vitest";
import { sortShadersNewestFirst } from "./order.js";
import type { ShaderObject } from "./types.js";

function shader(id: string, createdAt: number): ShaderObject {
  return {
    id,
    name: id,
    vertexSource: "",
    fragmentSource: "",
    createdAt,
  };
}

describe("sortShadersNewestFirst", () => {
  it("sorts shaders with newest first", () => {
    const shaders = [
      shader("old", 1000),
      shader("new", 3000),
      shader("mid", 2000),
    ];
    const sorted = sortShadersNewestFirst(shaders);
    expect(sorted.map((s) => s.id)).toEqual(["new", "mid", "old"]);
    expect(sorted.map((s) => s.createdAt)).toEqual([3000, 2000, 1000]);
  });

  it("does not mutate the input array", () => {
    const shaders = [shader("a", 2000), shader("b", 1000)];
    const original = [...shaders];
    sortShadersNewestFirst(shaders);
    expect(shaders).toEqual(original);
  });

  it("handles empty array", () => {
    expect(sortShadersNewestFirst([])).toEqual([]);
  });

  it("handles single shader", () => {
    const shaders = [shader("only", 5000)];
    expect(sortShadersNewestFirst(shaders)).toEqual(shaders);
  });

  it("preserves stable order for equal createdAt", () => {
    const shaders = [
      shader("first", 1000),
      shader("second", 1000),
      shader("third", 1000),
    ];
    const sorted = sortShadersNewestFirst(shaders);
    expect(sorted.map((s) => s.id)).toEqual(["first", "second", "third"]);
  });
});
