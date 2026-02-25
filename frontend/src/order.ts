/**
 * Tile ordering utilities.
 * Newest-first: most recently created tiles appear at the start of the grid.
 */
import type { ShaderObject } from "./types.js";

export function sortShadersNewestFirst(shaders: ShaderObject[]): ShaderObject[] {
  return [...shaders].sort((a, b) => b.createdAt - a.createdAt);
}
