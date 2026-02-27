/**
 * Shared offscreen validation context for shader compilation checks.
 * Single 1×1 WebGL2 context reused across merge, apply-directive, and add-from-prompt
 * to avoid allocating throwaway contexts that count against browser limits.
 *
 * Per CONVENTIONS.md: [VALID CODE] / [INVALID CODE] placeholders bypass real GPU.
 */
import { getShaderCompilationErrors } from "./shader-engine.js";

const VALID_PLACEHOLDER = "[VALID CODE]";
const INVALID_PLACEHOLDER = "[INVALID CODE]";

/** Default vertex shader (matches seed-shaders and merge/apply-directive) */
const DEFAULT_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

let canvas: HTMLCanvasElement | null = null;
let gl: WebGL2RenderingContext | null = null;

function getOrCreateContext(): WebGL2RenderingContext | null {
  if (gl) return gl;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
  }
  gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  return gl;
}

export interface CompileCheckResult {
  ok: boolean;
  compileError?: string;
  linkError?: string;
}

/**
 * Compile and link vertex+fragment shaders on the shared validation context.
 * Does not dispose the context; only cleans up the temporary program/shaders.
 * Handles [VALID CODE] / [INVALID CODE] placeholders for tests.
 */
export function compileCheck(
  fragmentSource: string,
  vertexSource: string = DEFAULT_VERTEX
): CompileCheckResult {
  if (fragmentSource === INVALID_PLACEHOLDER) {
    return { ok: false, compileError: INVALID_PLACEHOLDER };
  }
  if (fragmentSource === VALID_PLACEHOLDER) {
    return { ok: true };
  }

  const context = getOrCreateContext();
  if (!context) {
    return { ok: false, compileError: "WebGL2 not supported" };
  }

  const errors = getShaderCompilationErrors(context, vertexSource, fragmentSource);
  if (errors) {
    return {
      ok: false,
      compileError: errors.compileError,
      linkError: errors.linkError,
    };
  }
  return { ok: true };
}

/**
 * Dispose the shared validation context. Call from tests for clean teardown.
 * After disposal, the next compileCheck will create a new context.
 */
export function disposeValidationContext(): void {
  gl = null;
  canvas = null;
}
