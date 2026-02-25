/**
 * Apply directive: call POST /apply-directive, compile-retry loop, save on success.
 * Same 3-attempt pattern as merge.ts.
 */
import { applyDirective } from "./api.js";
import { createShaderEngine } from "./shader-engine.js";
import { showToast } from "./toast.js";
import type { ShaderObject } from "./types.js";
import type { ShaderStorage } from "./storage.js";

const MAX_ATTEMPTS = 3;

function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  const m = s.match(/^```(?:glsl)?\s*\n?([\s\S]*?)\n?```\s*$/m);
  if (m) return m[1].trim();
  return s.replace(/^```(?:glsl)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
}

const DEFAULT_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

function createTempCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas;
}

export interface ApplyDirectiveResult {
  success: boolean;
  shader?: ShaderObject;
}

export async function performApplyDirective(
  shader: ShaderObject,
  directive: string,
  storage: ShaderStorage,
  contextShaders?: ShaderObject[]
): Promise<ApplyDirectiveResult> {
  const fragmentSource = shader.fragmentSource;
  const contextCodes = contextShaders?.map((s) => s.fragmentSource) ?? [];

  let previousError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { fragmentSource: raw } = await applyDirective(
        fragmentSource,
        directive,
        contextCodes.length > 0 ? contextCodes : undefined,
        previousError
      );
      const newFragmentSource = stripMarkdownFences(raw);

      const canvas = createTempCanvas();
      const result = createShaderEngine({
        canvas,
        vertexSource: DEFAULT_VERTEX,
        fragmentSource: newFragmentSource,
      });

      if (result.success) {
        const name = directive.slice(0, 50) + (directive.length > 50 ? "…" : "");
        const newShader: ShaderObject = {
          id: crypto.randomUUID(),
          name,
          vertexSource: DEFAULT_VERTEX,
          fragmentSource: newFragmentSource,
          createdAt: Date.now(),
        };
        await storage.add(newShader);
        return { success: true, shader: newShader };
      }

      previousError = result.compileError ?? result.linkError ?? "Unknown compilation error";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showToast(`Apply directive failed: ${message}`);
      return { success: false };
    }
  }

  showToast("Shader failed to compile after 3 attempts. Please try again.");
  return { success: false };
}
