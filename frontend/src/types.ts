/**
 * Shader object persisted in IndexedDB.
 * Matches the GLSL API in CONVENTIONS.md: time, backbuffer, resolution, touch.
 */
export interface ShaderObject {
  id: string;
  name: string;
  vertexSource: string;
  fragmentSource: string;
  createdAt: number;
}
