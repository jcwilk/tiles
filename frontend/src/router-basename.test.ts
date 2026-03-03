import { describe, expect, it } from "vitest";
import { getRouterBasename } from "./router-basename.js";

describe("getRouterBasename", () => {
  it("strips trailing slash for GitHub Pages subpath", () => {
    expect(getRouterBasename("/tiles/")).toBe("/tiles");
  });

  it("keeps subpath without trailing slash unchanged", () => {
    expect(getRouterBasename("/tiles")).toBe("/tiles");
  });

  it("omits basename for root path", () => {
    expect(getRouterBasename("/")).toBeUndefined();
  });
});
