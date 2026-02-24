/**
 * Seeds initial application state when storage is empty.
 * Ensures default shaders are present on load (picks up new entries when SEED_SHADERS changes).
 */
import type { ShaderStorage } from "./storage.js";
import { createSeedShaders } from "./seed-shaders.js";

export async function seedIfEmpty(storage: ShaderStorage): Promise<boolean> {
  const existing = await storage.getAll();
  if (existing.length > 0) {
    await ensureDefaultShaders(storage, existing);
    return false;
  }
  const seeds = createSeedShaders();
  for (const shader of seeds) {
    await storage.add(shader);
  }
  return true;
}

/**
 * Adds any default seed shaders that are missing from storage.
 * Called on load when storage already has data, so new entries in SEED_SHADERS get picked up.
 */
async function ensureDefaultShaders(
  storage: ShaderStorage,
  existing: { id: string; name: string }[]
): Promise<void> {
  const seedNamesPresent = new Set(
    existing.filter((s) => s.id.startsWith("seed-")).map((s) => s.name)
  );
  const seeds = createSeedShaders();
  for (const shader of seeds) {
    if (!seedNamesPresent.has(shader.name)) {
      await storage.add(shader);
    }
  }
}
