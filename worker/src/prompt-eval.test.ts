/**
 * Prompt evaluation tests. Run via `npm run test:eval` (never via `npm test`).
 * Validates fixtures for staleness and structural GLSL; records when PROMPT_EVAL_RECORD=1.
 */
import { describe, it } from "vitest";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeInputHash } from "./prompt-eval.js";
import { validateGLSLStructure } from "./validateGLSL.js";
import { sanitizeGLSL } from "./index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = join(__dirname, "__fixtures__");

const EVAL_CASES = [
  { name: "gradient-plasma", fragmentAKey: "Gradient", fragmentBKey: "Plasma" },
  { name: "noise-circles", fragmentAKey: "Noise", fragmentBKey: "Circles" },
  { name: "stripes-rainbow", fragmentAKey: "Stripes", fragmentBKey: "Rainbow" },
] as const;

/** Canned fragment sources from seed-shaders (Gradient, Plasma, Noise, Circles, Stripes, Rainbow) */
const FRAGMENTS: Record<string, string> = {
  Gradient: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 uv = v_uv - 0.5;
  float t = u_time * 0.3;
  float d = length(uv);
  float layer1 = sin(uv.x * 4.0 + t) * cos(uv.y * 3.0 + t * 1.1) * 0.5 + 0.5;
  float layer2 = sin((uv.x + uv.y) * 5.0 + t * 0.7) * 0.5 + 0.5;
  float layer3 = sin(d * 8.0 - t * 2.0) * 0.5 + 0.5;
  vec3 col = vec3(
    sin(layer1 * 6.28) * 0.5 + 0.5,
    sin(layer2 * 6.28 + 2.09) * 0.5 + 0.5,
    sin(layer3 * 6.28 + 4.18) * 0.5 + 0.5
  );
  fragColor = vec4(col, 1.0);
}
`,
  Plasma: `#version 300 es
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
  Noise: `#version 300 es
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
  vec2 uv = v_uv * 6.0 + vec2(u_time * 0.3, u_time * 0.2);
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(hash(i), hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
  float n2 = mix(
    mix(hash(i + 17.3), hash(i + vec2(1,0) + 17.3), f.x),
    mix(hash(i + vec2(0,1) + 17.3), hash(i + vec2(1,1) + 17.3), f.x),
    f.y
  );
  vec3 col = vec3(
    sin(n * 6.28 + u_time) * 0.5 + 0.5,
    sin(n2 * 6.28 + u_time * 0.7 + 2.09) * 0.5 + 0.5,
    sin((n + n2) * 3.14 + u_time * 0.5 + 4.18) * 0.5 + 0.5
  );
  fragColor = vec4(col, 1.0);
}
`,
  Circles: `#version 300 es
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
  float angle = atan(uv.y, uv.x);
  float rings = sin(d * 20.0 - u_time * 3.0) * 0.5 + 0.5;
  float spiral = sin(angle * 4.0 + d * 8.0 + u_time * 2.0) * 0.5 + 0.5;
  vec3 col = vec3(
    sin(rings * 6.28) * 0.5 + 0.5,
    sin(spiral * 6.28 + 2.09) * 0.5 + 0.5,
    sin((rings + spiral) * 3.14 + u_time) * 0.5 + 0.5
  );
  fragColor = vec4(col, 1.0);
}
`,
  Stripes: `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  vec2 uv = v_uv - 0.5;
  float wave = sin(uv.y * 10.0 + uv.x * 3.0 + u_time * 0.5) * 0.1;
  uv.x += wave;
  uv.y += sin(uv.x * 3.0 + u_time * 0.3) * 0.05;
  float stripes = sin(uv.y * 25.0 + u_time * 4.0) * 0.5 + 0.5;
  stripes *= sin(uv.x * 20.0 + u_time * 2.0) * 0.5 + 0.5;
  float hue = uv.x + uv.y + u_time * 0.2;
  vec3 col = vec3(
    sin(hue * 6.28) * 0.5 + 0.5,
    sin(hue * 6.28 + 2.09) * 0.5 + 0.5,
    sin(hue * 6.28 + 4.18) * 0.5 + 0.5
  );
  col *= stripes * 0.8 + 0.2;
  fragColor = vec4(col, 1.0);
}
`,
  Rainbow: `#version 300 es
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
  float angle = atan(uv.y, uv.x);
  float hue = fract(angle / 6.28318 + d * 2.0 + u_time * 0.3);
  vec3 col = vec3(
    abs(hue * 6.0 - 3.0) - 1.0,
    2.0 - abs(hue * 6.0 - 2.0),
    2.0 - abs(hue * 6.0 - 4.0)
  );
  col = clamp(col, 0.0, 1.0);
  float pulse = sin(d * 15.0 - u_time * 2.0) * 0.5 + 0.5;
  col *= pulse * 0.5 + 0.5;
  fragColor = vec4(col, 1.0);
}
`,
};

interface Fixture {
  inputHash: string;
  fragmentA: string;
  fragmentB: string;
  previousError: string | null;
  output: string;
  recordedAt: string;
}

const RECORD_MODE = process.env.PROMPT_EVAL_RECORD === "1";
const API_URL = process.env.PROMPT_EVAL_API_URL ?? "http://localhost:8787";

describe("prompt-eval", () => {
  for (const { name, fragmentAKey, fragmentBKey } of EVAL_CASES) {
    const fragmentA = FRAGMENTS[fragmentAKey];
    const fragmentB = FRAGMENTS[fragmentBKey];
    const fixturePath = join(FIXTURES_DIR, `${name}.json`);

    it(`${name}: validates fixture structure and staleness`, async () => {
      const currentHash = computeInputHash(fragmentA, fragmentB, null);

      if (RECORD_MODE) {
        const res = await fetch(`${API_URL}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:5173",
          },
          body: JSON.stringify({ fragmentA, fragmentB }),
        });
        if (!res.ok) {
          throw new Error(
            `Record failed: ${res.status} ${await res.text()}. Ensure worker is running (npm run dev -w worker) and PROMPT_EVAL=1.`
          );
        }
        const data = (await res.json()) as { fragmentSource: string };
        const output = sanitizeGLSL(data.fragmentSource);

        const fixture: Fixture = {
          inputHash: currentHash,
          fragmentA,
          fragmentB,
          previousError: null,
          output,
          recordedAt: new Date().toISOString(),
        };
        writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + "\n");
      }

      if (!existsSync(fixturePath)) {
        throw new Error(
          `Fixture missing: ${fixturePath}. Run 'npm run test:eval:record' (with worker running) to create.`
        );
      }

      const raw = readFileSync(fixturePath, "utf-8");
      const fixture: Fixture = JSON.parse(raw) as Fixture;

      if (!fixture.inputHash || fixture.inputHash !== currentHash) {
        throw new Error(
          `Fixture stale: prompt or inputs changed for ${name}. Run 'npm run test:eval:record' to re-record.`
        );
      }

      const validation = validateGLSLStructure(fixture.output);
      if (!validation.valid) {
        throw new Error(
          `Fixture ${name} output fails structural validation: ${validation.errors.join("; ")}`
        );
      }
    });
  }
});
