/**
 * Tests for WebGL context loss detection and click-to-recover.
 * Mocks createShaderEngine to simulate context loss without real WebGL.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTile, disposeTile } from "./tile.js";
import type { ShaderObject } from "./types.js";

const PLACEHOLDER_SHADER: ShaderObject = {
  id: "test-ctx",
  name: "Test",
  vertexSource: "in vec2 a_position;",
  fragmentSource: "[VALID CODE]",
  createdAt: Date.now(),
};

let capturedOnContextLost: (() => void) | null = null;
let failRecoveryCreation = false;
let createCallCount = 0;
const mockEngine = {
  render: vi.fn(),
  resize: vi.fn(),
  setTouch: vi.fn(),
  getLastError: () => null,
  dispose: vi.fn(),
  getLoseContextExtension: () => null,
};

vi.mock("./shader-engine.js", () => ({
  createShaderEngine: vi.fn((config: { onContextLost?: () => void }) => {
    capturedOnContextLost = config.onContextLost ?? null;
    createCallCount++;
    if (failRecoveryCreation && createCallCount > 1) {
      return { success: false, compileError: "Too many contexts" };
    }
    return {
      success: true,
      engine: mockEngine,
    };
  }),
}));

vi.mock("./toast.js", () => ({
  showToast: vi.fn(),
}));

vi.mock("./webgl-context-pool.js", () => ({
  getDefaultPool: () => ({
    acquire: () => ({}),
    release: () => {},
    markVisible: () => {},
    markOffscreen: () => {},
    markOffscreenMany: () => {},
    markFullscreen: () => {},
  }),
}));

describe("tile context loss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnContextLost = null;
    failRecoveryCreation = false;
    createCallCount = 0;
  });

  it("shows placeholder when context is lost", () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    expect(tile.element.querySelector(".tile-paused")).toBeNull();

    capturedOnContextLost?.();

    expect(tile.element.querySelector(".tile-paused")).toBeTruthy();
    expect(tile.element.querySelector(".tile-paused-overlay")?.textContent).toBe("Click to resume");
    disposeTile(tile);
  });

  it("click on placeholder attempts recovery", async () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    capturedOnContextLost?.();

    const placeholder = tile.element.querySelector(".tile-paused");
    expect(placeholder).toBeTruthy();
    (placeholder as HTMLElement).click();

    const { createShaderEngine } = await import("./shader-engine.js");
    expect(createShaderEngine).toHaveBeenCalledTimes(2);
    disposeTile(tile);
  });

  it("shows toast when recovery fails", async () => {
    failRecoveryCreation = true;
    const tile = createTile(PLACEHOLDER_SHADER);
    capturedOnContextLost?.();

    const placeholder = tile.element.querySelector(".tile-paused");
    expect(placeholder).toBeTruthy();
    (placeholder as HTMLElement).click();

    const { showToast } = await import("./toast.js");
    expect(showToast).toHaveBeenCalledWith("Too many active shaders — close some tiles");
    disposeTile(tile);
  });
});
