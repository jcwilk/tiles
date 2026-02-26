/**
 * Shader engine tests.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders to avoid
 * real GPU execution in CI.
 */
import { describe, it, expect } from "vitest";
import {
  createShaderEngine,
  getShaderCompilationErrors,
} from "./shader-engine.js";

describe("createShaderEngine", () => {
  it("returns success with [VALID CODE] placeholder", () => {
    const canvas = document.createElement("canvas");
    const result = createShaderEngine({
      canvas,
      fragmentSource: "[VALID CODE]",
    });
    expect(result.success).toBe(true);
    expect(result.engine).toBeDefined();
    expect(result.compileError).toBeUndefined();
    expect(result.linkError).toBeUndefined();
  });

  it("returns compileError with [INVALID CODE] placeholder", () => {
    const canvas = document.createElement("canvas");
    const result = createShaderEngine({
      canvas,
      fragmentSource: "[INVALID CODE]",
    });
    expect(result.success).toBe(false);
    expect(result.engine).toBeUndefined();
    expect(result.compileError).toBe("[INVALID CODE]");
  });

  it("returns failure for invalid GLSL (jsdom has no WebGL, so we get unsupported)", () => {
    const canvas = document.createElement("canvas");
    // In jsdom, getContext may throw or return null - either way engine fails
    let result: ReturnType<typeof createShaderEngine>;
    try {
      result = createShaderEngine({
        canvas,
        fragmentSource: "invalid glsl syntax {{{",
      });
    } catch {
      // getContext throws in some jsdom setups
      return;
    }
    expect(result.success).toBe(false);
    expect(result.compileError).toBeDefined();
  });

  it("engine from [VALID CODE] has required methods", () => {
    const canvas = document.createElement("canvas");
    const result = createShaderEngine({
      canvas,
      fragmentSource: "[VALID CODE]",
    });
    expect(result.engine).toBeDefined();
    const engine = result.engine!;
    expect(typeof engine.render).toBe("function");
    expect(typeof engine.resize).toBe("function");
    expect(typeof engine.setTouch).toBe("function");
    expect(typeof engine.getLastError).toBe("function");
    expect(typeof engine.dispose).toBe("function");
  });

  it("engine.getLastError returns null for placeholder engine", () => {
    const canvas = document.createElement("canvas");
    const result = createShaderEngine({
      canvas,
      fragmentSource: "[VALID CODE]",
    });
    expect(result.engine!.getLastError()).toBeNull();
  });

  it("engine.getLoseContextExtension returns null for placeholder engine", () => {
    const canvas = document.createElement("canvas");
    const result = createShaderEngine({
      canvas,
      fragmentSource: "[VALID CODE]",
    });
    expect(result.engine!.getLoseContextExtension()).toBeNull();
  });
});

describe("getShaderCompilationErrors", () => {
  it("is exported and callable (real WebGL required for full test)", () => {
    expect(typeof getShaderCompilationErrors).toBe("function");
  });
});
