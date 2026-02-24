/**
 * Merge orchestration: call worker API, compile, retry on failure, save on success.
 * Per ARCHITECTURE.md: up to 3 attempts with compiler error feedback.
 */
import { generateMerge } from "./api.js";
import { createShaderEngine } from "./shader-engine.js";
import { showToast } from "./toast.js";
import type { ShaderObject } from "./types.js";
import type { ShaderStorage } from "./storage.js";

const MAX_ATTEMPTS = 3;

/** Default vertex shader for merged fragments (matches seed-shaders) */
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

export interface MergeResult {
  success: boolean;
  shader?: ShaderObject;
}

export async function performMerge(
  sourceShader: ShaderObject,
  targetShader: ShaderObject,
  storage: ShaderStorage
): Promise<MergeResult> {
  const fragmentA = sourceShader.fragmentSource;
  const fragmentB = targetShader.fragmentSource;

  let previousError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { fragmentSource } = await generateMerge(fragmentA, fragmentB, previousError);

      const canvas = createTempCanvas();
      const result = createShaderEngine({
        canvas,
        vertexSource: DEFAULT_VERTEX,
        fragmentSource,
      });

      if (result.success) {
        const shader: ShaderObject = {
          id: crypto.randomUUID(),
          name: `Merge: ${sourceShader.name} + ${targetShader.name}`,
          vertexSource: DEFAULT_VERTEX,
          fragmentSource,
          createdAt: Date.now(),
        };
        await storage.add(shader);
        return { success: true, shader };
      }

      previousError = result.compileError ?? result.linkError ?? "Unknown compilation error";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showToast(`Merge failed: ${message}`);
      return { success: false };
    }
  }

  showToast("Shader failed to compile after 3 attempts. Please try again.");
  return { success: false };
}
