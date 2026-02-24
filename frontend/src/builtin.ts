/**
 * Built-in tile detection.
 * Seed shaders (IDs matching seed-*) are the six original tiles and cannot be deleted.
 */
export function isBuiltInTile(id: string): boolean {
  return id.startsWith("seed-");
}
