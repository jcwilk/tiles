/**
 * Structural GLSL validator for prompt eval.
 * Validates: #version 300 es, precision highp float, required uniforms, main(), balanced braces.
 */

export interface GLSLValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_UNIFORMS = ["u_time", "u_resolution", "u_touch"] as const;

/**
 * Validates that GLSL fragment shader has required structure.
 * Does not execute or compile; checks version, precision, uniforms, main, and braces.
 */
export function validateGLSLStructure(glsl: string): GLSLValidationResult {
  const errors: string[] = [];
  const code = glsl.trim();

  if (!code) {
    return { valid: false, errors: ["Empty shader"] };
  }

  if (!/^#version\s+300\s+es/im.test(code)) {
    errors.push("Missing or invalid #version 300 es");
  }

  if (!/precision\s+(lowp|mediump|highp)\s+float/im.test(code)) {
    errors.push("Missing precision highp float (or lowp/mediump)");
  }

  for (const uniform of REQUIRED_UNIFORMS) {
    const re = new RegExp(`uniform\\s+(?:float|vec2)\\s+${uniform}\\s*;`, "im");
    if (!re.test(code)) {
      errors.push(`Missing required uniform: ${uniform}`);
    }
  }

  if (!/\bvoid\s+main\s*\(/im.test(code)) {
    errors.push("Missing void main()");
  }

  const braceBalance = countBraces(code);
  if (braceBalance !== 0) {
    errors.push(`Unbalanced braces (delta: ${braceBalance})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function countBraces(code: string): number {
  let balance = 0;
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    const next = code[i + 1];

    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inString) {
      if (c === "\\" && next) {
        i++;
        continue;
      }
      if (c === '"' || c === "'") inString = false;
      continue;
    }

    if (c === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      continue;
    }

    if (c === "{") balance++;
    if (c === "}") balance--;
  }

  return balance;
}
