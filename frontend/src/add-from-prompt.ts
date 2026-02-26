/**
 * Add new tile from text prompt: call generate-from-prompt API, compile, retry, save.
 */
import { generateFromPrompt } from "./api.js";
import { compileCheck } from "./validation-context.js";
import { showToast } from "./toast.js";
import type { ShaderObject } from "./types.js";
import type { ShaderStorage } from "./storage.js";

const MAX_ATTEMPTS = 3;

const DEFAULT_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export interface AddFromPromptResult {
  success: boolean;
  shader?: ShaderObject;
}

export async function performAddFromPrompt(
  prompt: string,
  storage: ShaderStorage
): Promise<AddFromPromptResult> {
  const trimmed = prompt.trim();
  if (!trimmed) return { success: false };

  let previousError: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { fragmentSource: raw } = await generateFromPrompt(trimmed, previousError);
      const fragmentSource = raw.trim();

      const result = compileCheck(fragmentSource, DEFAULT_VERTEX);

      if (result.ok) {
        const shader: ShaderObject = {
          id: crypto.randomUUID(),
          name: trimmed.slice(0, 50),
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
      showToast(`Generation failed: ${message}`);
      return { success: false };
    }
  }

  showToast("Shader failed to compile after 3 attempts. Please try again.");
  return { success: false };
}
