/**
 * Seeds initial application state when storage is empty.
 */
import type { ShaderStorage } from "./storage.js";
import { createSeedShaders } from "./seed-shaders.js";

export async function seedIfEmpty(storage: ShaderStorage): Promise<boolean> {
  const existing = await storage.getAll();
  if (existing.length > 0) {
    return false;
  }
  const seeds = createSeedShaders();
  for (const shader of seeds) {
    await storage.add(shader);
  }
  return true;
}
