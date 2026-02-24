/**
 * Seed shaders for initial application state.
 * Six basic, visually distinct shaders as the foundation for user combinations.
 * All shaders use the standard GLSL API: time, backbuffer, resolution, touch.
 */
import type { ShaderObject } from "./types.js";

const VERTEX_PASSTHROUGH = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const SEED_SHADERS: Omit<ShaderObject, "id" | "createdAt">[] = [
  {
    name: "Gradient",
    vertexSource: VERTEX_PASSTHROUGH,
    fragmentSource: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 uv = v_uv;
  float t = u_time * 0.3;
  vec3 col = vec3(
    sin(uv.x * 3.0 + t) * 0.5 + 0.5,
    cos(uv.y * 2.0 + t * 1.2) * 0.5 + 0.5,
    sin(uv.x + uv.y + t * 0.8) * 0.5 + 0.5
  );
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    name: "Plasma",
    vertexSource: VERTEX_PASSTHROUGH,
    fragmentSource: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 uv = v_uv - 0.5;
  float t = u_time * 2.0;
  float v = sin(uv.x * 10.0 + t) + sin(uv.y * 10.0 + t * 1.3);
  v += sin((uv.x + uv.y) * 10.0 + t * 0.7);
  v = v * 0.33 + 0.5;
  vec3 col = vec3(sin(v * 6.28), sin(v * 6.28 + 2.09), sin(v * 6.28 + 4.18)) * 0.5 + 0.5;
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    name: "Noise",
    vertexSource: VERTEX_PASSTHROUGH,
    fragmentSource: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  vec2 uv = v_uv * 8.0 + u_time * 0.5;
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  float n = mix(
    mix(hash(i), hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
  fragColor = vec4(vec3(n), 1.0);
}
`,
  },
  {
    name: "Circles",
    vertexSource: VERTEX_PASSTHROUGH,
    fragmentSource: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 uv = v_uv - 0.5;
  uv.x *= u_resolution.x / u_resolution.y;
  float d = length(uv);
  float rings = sin(d * 20.0 - u_time * 3.0) * 0.5 + 0.5;
  vec3 col = vec3(1.0 - rings, rings * 0.5, rings);
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    name: "Stripes",
    vertexSource: VERTEX_PASSTHROUGH,
    fragmentSource: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  float stripes = sin(v_uv.y * 20.0 + u_time * 4.0) * 0.5 + 0.5;
  stripes *= sin(v_uv.x * 15.0 + u_time * 2.0) * 0.5 + 0.5;
  vec3 col = vec3(stripes, stripes * 0.7, 1.0 - stripes);
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    name: "Rainbow",
    vertexSource: VERTEX_PASSTHROUGH,
    fragmentSource: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  float hue = v_uv.x + u_time * 0.2;
  hue = fract(hue);
  vec3 col = vec3(
    abs(hue * 6.0 - 3.0) - 1.0,
    2.0 - abs(hue * 6.0 - 2.0),
    2.0 - abs(hue * 6.0 - 4.0)
  );
  col = clamp(col, 0.0, 1.0);
  float fade = sin(v_uv.y * 3.14) * 0.5 + 0.5;
  col *= fade;
  fragColor = vec4(col, 1.0);
}
`,
  },
];

export function createSeedShaders(): ShaderObject[] {
  const now = Date.now();
  return SEED_SHADERS.map((s, i) => ({
    ...s,
    id: `seed-${i}-${now}`,
    createdAt: now,
  }));
}
