import { describe, it, expect } from "vitest";
import { validateGLSLStructure } from "./validateGLSL.js";

const VALID_MINIMAL = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
in vec2 v_uv;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.5, 0.5, 0.5, 1.0);
}
`;

describe("validateGLSLStructure", () => {
  it("accepts valid minimal shader", () => {
    const r = validateGLSLStructure(VALID_MINIMAL);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("rejects empty shader", () => {
    const r = validateGLSLStructure("");
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Empty shader");
  });

  it("rejects missing #version 300 es", () => {
    const r = validateGLSLStructure(`precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing or invalid #version 300 es");
  });

  it("rejects invalid version", () => {
    const r = validateGLSLStructure(`#version 100 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing or invalid #version 300 es");
  });

  it("rejects missing precision", () => {
    const r = validateGLSLStructure(`#version 300 es
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing precision highp float (or lowp/mediump)");
  });

  it("accepts lowp and mediump precision", () => {
    const r = validateGLSLStructure(`#version 300 es
precision lowp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(true);
  });

  it("rejects missing required uniform u_time", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing required uniform: u_time");
  });

  it("rejects missing required uniform u_resolution", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_touch;
void main(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing required uniform: u_resolution");
  });

  it("rejects missing required uniform u_touch", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
void main(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing required uniform: u_touch");
  });

  it("rejects missing void main()", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void foo(){ fragColor = vec4(1); }`);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing void main()");
  });

  it("accepts void main () with space", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main () { fragColor = vec4(1); }`);
    expect(r.valid).toBe(true);
  });

  it("rejects unbalanced braces (extra open)", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main() {
  fragColor = vec4(1);
`);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Unbalanced braces"))).toBe(true);
  });

  it("rejects unbalanced braces (extra close)", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main() {
  fragColor = vec4(1);
}}
`);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("Unbalanced braces"))).toBe(true);
  });

  it("ignores braces in comments", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main() {
  // { } in comment
  fragColor = vec4(1);
}`);
    expect(r.valid).toBe(true);
  });

  it("ignores braces in block comments", () => {
    const r = validateGLSLStructure(`#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_touch;
void main() {
  /* { } in block */
  fragColor = vec4(1);
}`);
    expect(r.valid).toBe(true);
  });
});
