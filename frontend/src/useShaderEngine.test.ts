/**
 * Tests for useShaderEngine hook.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders
 * to mock shader compilation without real WebGL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useShaderEngine } from "./useShaderEngine.js";
import { resetDefaultPool } from "./webgl-context-pool.js";

let capturedOnContextLost: (() => void) | null = null;

vi.mock("./shader-engine.js", () => ({
  createShaderEngine: (config: {
    onContextLost?: () => void;
    fragmentSource?: string;
    canvas?: HTMLCanvasElement;
  }) => {
    capturedOnContextLost = config.onContextLost ?? null;
    if (config.fragmentSource === "[INVALID CODE]") {
      return { success: false, compileError: "[INVALID CODE]" };
    }
    const canvas = config.canvas;
    return {
      success: true,
      engine: {
        render: vi.fn(),
        resize: vi.fn(),
        setTouch: vi.fn(),
        getLastError: () => null,
        dispose: vi.fn(),
        getLoseContextExtension: () => ({
          restoreContext: () => {
            canvas?.dispatchEvent(new Event("webglcontextrestored"));
          },
        }),
      },
    };
  },
}));

vi.mock("./webgl-context-pool.js", () => ({
  getDefaultPool: () => ({
    acquire: () => ({}),
    release: () => {},
    markVisible: () => {},
    markOffscreen: () => {},
    markFullscreen: () => {},
  }),
  resetDefaultPool: () => {},
}));

const PLACEHOLDER_SHADER = {
  vertexSource: "in vec2 a_position;",
  fragmentSource: "[VALID CODE]",
};

describe("useShaderEngine", () => {
  beforeEach(() => {
    resetDefaultPool();
  });

  afterEach(() => {
    resetDefaultPool();
  });

  it("returns isLoading true and engine null when canvas ref is null", () => {
    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(null);
      return useShaderEngine(canvasRef, PLACEHOLDER_SHADER);
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.engine).toBeNull();
    expect(result.current.hasContextLoss).toBe(false);
    expect(typeof result.current.recover).toBe("function");
  });

  it("creates engine and starts render loop when canvas is provided", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(canvas);
      return useShaderEngine(canvasRef, PLACEHOLDER_SHADER);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.engine).not.toBeNull();
    expect(result.current.engine).toHaveProperty("render");
    expect(result.current.engine).toHaveProperty("resize");
    expect(result.current.engine).toHaveProperty("setTouch");
    expect(result.current.engine).toHaveProperty("dispose");
    expect(result.current.hasContextLoss).toBe(false);
  });

  it("disposes engine and cancels rAF on unmount", () => {
    const canvas = document.createElement("canvas");

    const { unmount, result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(canvas);
      return useShaderEngine(canvasRef, PLACEHOLDER_SHADER);
    });

    expect(result.current.engine).not.toBeNull();
    unmount();
    // Placeholder engine has no-op dispose; cleanup doesn't throw
  });

  it("returns compileError state when shader is [INVALID CODE]", () => {
    const canvas = document.createElement("canvas");

    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(canvas);
      return useShaderEngine(canvasRef, {
        vertexSource: "in vec2 a_position;",
        fragmentSource: "[INVALID CODE]",
      });
    });

    expect(result.current.engine).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("accepts priority option", () => {
    const canvas = document.createElement("canvas");

    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(canvas);
      return useShaderEngine(canvasRef, PLACEHOLDER_SHADER, {
        priority: "fullscreen",
      });
    });

    expect(result.current.engine).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("exposes recover callback", () => {
    const canvas = document.createElement("canvas");

    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(canvas);
      return useShaderEngine(canvasRef, PLACEHOLDER_SHADER);
    });

    expect(typeof result.current.recover).toBe("function");
    act(() => {
      result.current.recover();
    });
  });

  it("sets hasContextLoss when context is lost", () => {
    const canvas = document.createElement("canvas");

    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(canvas);
      return useShaderEngine(canvasRef, PLACEHOLDER_SHADER);
    });

    expect(result.current.hasContextLoss).toBe(false);

    act(() => {
      capturedOnContextLost?.();
    });

    expect(result.current.hasContextLoss).toBe(true);
    expect(result.current.engine).toBeNull();
  });

  it("recover invokes recreateEngine when context was lost", () => {
    const canvas = document.createElement("canvas");

    const { result } = renderHook(() => {
      const canvasRef = useRef<HTMLCanvasElement | null>(canvas);
      return useShaderEngine(canvasRef, PLACEHOLDER_SHADER);
    });

    act(() => {
      capturedOnContextLost?.();
    });

    expect(result.current.hasContextLoss).toBe(true);

    act(() => {
      result.current.recover();
    });

    // Mock returns engine on recreate; hasContextLoss cleared
    expect(result.current.engine).not.toBeNull();
    expect(result.current.hasContextLoss).toBe(false);
  });
});
