/**
 * Built-in tile detection.
 * A shader is builtin only if it was originally a seed (id starts with seed-)
 * AND its name still exists in the current default seed definitions.
 * Obsolete seeds (removed from SEED_SHADERS) become deletable.
 */
import { SEED_SHADERS } from "./seed-shaders.js";

export function isBuiltInTile(shader: { id: string; name: string }): boolean {
  if (!shader.id.startsWith("seed-")) return false;
  return SEED_SHADERS.some((s) => s.name === shader.name);
}
