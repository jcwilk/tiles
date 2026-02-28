/**
 * Tile component tests.
 * Uses [VALID CODE] placeholder to avoid real WebGL in CI.
 */
import { describe, it, expect, vi } from "vitest";
import { createTile, disposeTile } from "./tile.js";
import type { ShaderObject } from "./types.js";

const PLACEHOLDER_SHADER: ShaderObject = {
  id: "test-1",
  name: "Placeholder",
  vertexSource: "in vec2 a_position;",
  fragmentSource: "[VALID CODE]",
  createdAt: Date.now(),
};

describe("createTile", () => {
  it("creates tile element with shader", () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    expect(tile.element).toBeInstanceOf(HTMLElement);
    expect(tile.element.className).toBe("tile");
    expect(tile.shader).toBe(PLACEHOLDER_SHADER);
    expect(tile.element.dataset.shaderId).toBe("test-1");
  });

  it("creates engine for valid placeholder shader", () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    expect(tile.engine).not.toBeNull();
  });

  it("disposeTile cleans up without error", () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    expect(() => disposeTile(tile)).not.toThrow();
  });

  it("adds delete button when onDelete is provided", () => {
    const onDelete = vi.fn();
    const tile = createTile(PLACEHOLDER_SHADER, { onDelete });
    const btn = tile.element.querySelector(".tile-delete");
    expect(btn).toBeInstanceOf(HTMLButtonElement);
    (btn as HTMLButtonElement).click();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("omits delete button when onDelete is not provided (built-in tiles)", () => {
    const builtInShader: ShaderObject = {
      ...PLACEHOLDER_SHADER,
      id: "seed-0-123",
    };
    const tile = createTile(builtInShader);
    const btn = tile.element.querySelector(".tile-delete");
    expect(btn).toBeNull();
  });
});
