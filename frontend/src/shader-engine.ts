/**
 * WebGL Shader Engine
 *
 * Lightweight WebGL runner handling compilation, rendering, and context management.
 * Implements ping-pong framebuffers for backbuffer support. Injects standard uniforms:
 * u_time, u_resolution, u_backbuffer (sampler2D), u_touch.
 *
 * Per CONVENTIONS.md: Shaders use the standard GLSL API.
 * Placeholder strings [VALID CODE] / [INVALID CODE] bypass real GPU for tests.
 */

const VALID_PLACEHOLDER = "[VALID CODE]";
const INVALID_PLACEHOLDER = "[INVALID CODE]";
export interface ShaderEngineConfig {
  canvas: HTMLCanvasElement;
  vertexSource?: string;
  fragmentSource: string;
  width?: number;
  height?: number;
  /** Called when WebGL context is lost. Call e.preventDefault() so browser allows restoration. */
  onContextLost?: () => void;
  /** Called when WebGL context is restored (e.g. after restoreContext()). */
  onContextRestored?: () => void;
}

export interface ShaderEngineResult {
  success: boolean;
  compileError?: string;
  linkError?: string;
}

/** WEBGL_lose_context extension for simulating/restoring context loss. */
export interface WEBGLLoseContext {
  loseContext(): void;
  restoreContext(): void;
}

export interface ShaderEngine {
  /** Render one frame. Call from requestAnimationFrame. */
  render(): void;
  /** Resize the canvas and framebuffers. */
  resize(width: number, height: number): void;
  /** Update touch position (normalized 0–1). */
  setTouch(x: number, y: number): void;
  /** Get last compilation or linking error, if any. */
  getLastError(): string | null;
  /** Dispose of WebGL resources. */
  dispose(): void;
  /** Get WEBGL_lose_context extension for restoreContext(), or null. */
  getLoseContextExtension(): WEBGLLoseContext | null;
}

const DEFAULT_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function getShaderInfoLog(gl: WebGL2RenderingContext, shader: WebGLShader): string | null {
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return gl.getShaderInfoLog(shader) ?? "Unknown compile error";
  }
  return null;
}

function getProgramInfoLog(gl: WebGL2RenderingContext, program: WebGLProgram): string | null {
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return gl.getProgramInfoLog(program) ?? "Unknown link error";
  }
  return null;
}

function createTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number
): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function createFramebuffer(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture
): WebGLFramebuffer | null {
  const fbo = gl.createFramebuffer();
  if (!fbo) return null;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return fbo;
}

/**
 * Compile and link shaders without creating a full engine.
 * Returns compilation or linking errors for retry/display.
 */
function createNoopEngine(canvas: HTMLCanvasElement, _width: number, _height: number): ShaderEngine {
  return {
    render() {},
    resize(width: number, height: number) {
      canvas.width = width;
      canvas.height = height;
    },
    setTouch() {},
    getLastError() {
      return null;
    },
    dispose() {},
    getLoseContextExtension() {
      return null;
    },
  };
}

export function getShaderCompilationErrors(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): { compileError?: string; linkError?: string } | null {
  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertShader || !fragShader) {
    return { compileError: "Failed to create shader" };
  }

  const vertErr = getShaderInfoLog(gl, vertShader);
  if (vertErr) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return { compileError: `Vertex: ${vertErr}` };
  }

  const fragErr = getShaderInfoLog(gl, fragShader);
  if (fragErr) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return { compileError: `Fragment: ${fragErr}` };
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return { compileError: "Failed to create program" };
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.deleteShader(vertShader);
  gl.deleteShader(fragShader);
  gl.linkProgram(program);

  const linkErr = getProgramInfoLog(gl, program);
  gl.deleteProgram(program);
  if (linkErr) {
    return { linkError: linkErr };
  }

  return null;
}

export function createShaderEngine(config: ShaderEngineConfig): ShaderEngineResult & { engine?: ShaderEngine } {
  const {
    canvas,
    vertexSource = DEFAULT_VERTEX,
    fragmentSource,
    width = canvas.width || 256,
    height = canvas.height || 256,
    onContextLost,
    onContextRestored,
  } = config;

  // Placeholder bypass for tests (CONVENTIONS.md)
  if (fragmentSource === INVALID_PLACEHOLDER) {
    return { success: false, compileError: INVALID_PLACEHOLDER };
  }
  if (fragmentSource === VALID_PLACEHOLDER) {
    const engine = createNoopEngine(canvas, width, height);
    engine.resize(width, height);
    return { success: true, engine };
  }

  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });

  if (!gl) {
    return {
      success: false,
      compileError: "WebGL2 not supported",
    };
  }

  const loseContextExt = gl.getExtension("WEBGL_lose_context") as WEBGLLoseContext | null;

  canvas.addEventListener(
    "webglcontextlost",
    (e: Event) => {
      e.preventDefault();
      onContextLost?.();
    },
    false
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      onContextRestored?.();
    },
    false
  );

  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertShader || !fragShader) {
    const err = vertShader
      ? getShaderInfoLog(gl, fragShader!)
      : getShaderInfoLog(gl, vertShader!);
    return {
      success: false,
      compileError: err ?? "Failed to create shader",
    };
  }

  const vertErr = getShaderInfoLog(gl, vertShader);
  if (vertErr) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return { success: false, compileError: `Vertex: ${vertErr}` };
  }

  const fragErr = getShaderInfoLog(gl, fragShader);
  if (fragErr) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return { success: false, compileError: `Fragment: ${fragErr}` };
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return { success: false, compileError: "Failed to create program" };
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.deleteShader(vertShader);
  gl.deleteShader(fragShader);
  gl.linkProgram(program);

  const linkErr = getProgramInfoLog(gl, program);
  if (linkErr) {
    gl.deleteProgram(program);
    return { success: false, linkError: linkErr };
  }

  // Quad geometry
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  // Ping-pong framebuffers
  let fboWidth = width;
  let fboHeight = height;

  const texA = createTexture(gl, fboWidth, fboHeight);
  const texB = createTexture(gl, fboWidth, fboHeight);
  const fboA = texA ? createFramebuffer(gl, texA) : null;
  const fboB = texB ? createFramebuffer(gl, texB) : null;

  if (!texA || !texB || !fboA || !fboB) {
    gl.deleteProgram(program);
    gl.deleteBuffer(quadBuffer);
    texA && gl.deleteTexture(texA);
    texB && gl.deleteTexture(texB);
    fboA && gl.deleteFramebuffer(fboA);
    fboB && gl.deleteFramebuffer(fboB);
    return { success: false, linkError: "Failed to create framebuffers" };
  }

  let readIdx = 0; // 0 = read from texB (backbuffer), write to texA
  let lastError: string | null = null;
  let touchX = 0.5;
  let touchY = 0.5;
  let startTime = performance.now();

  const engine: ShaderEngine = {
    render() {
      gl.useProgram(program);

      const uTime = gl.getUniformLocation(program, "u_time");
      const uResolution = gl.getUniformLocation(program, "u_resolution");
      const uTouch = gl.getUniformLocation(program, "u_touch");
      const uBackbuffer = gl.getUniformLocation(program, "u_backbuffer");
      const aPosition = gl.getAttribLocation(program, "a_position");

      const time = (performance.now() - startTime) / 1000;

      // Ping-pong: read from "read" texture, write to "write" framebuffer
      const readTex = readIdx === 0 ? texB : texA;
      const writeFbo = readIdx === 0 ? fboA : fboB;

      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo);
      gl.viewport(0, 0, fboWidth, fboHeight);

      if (uTime) gl.uniform1f(uTime, time);
      if (uResolution) gl.uniform2f(uResolution, fboWidth, fboHeight);
      if (uTouch) gl.uniform2f(uTouch, touchX, touchY);

      if (uBackbuffer) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTex);
        gl.uniform1i(uBackbuffer, 0);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);

      // Blit to screen
      gl.viewport(0, 0, fboWidth, fboHeight);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, writeFbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(0, 0, fboWidth, fboHeight, 0, 0, fboWidth, fboHeight, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);

      readIdx = 1 - readIdx;
    },

    resize(w: number, h: number) {
      if (w <= 0 || h <= 0) return;
      fboWidth = w;
      fboHeight = h;

      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, texB);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindTexture(gl.TEXTURE_2D, null);

      canvas.width = w;
      canvas.height = h;
    },

    setTouch(x: number, y: number) {
      touchX = x;
      touchY = y;
    },

    getLastError() {
      return lastError;
    },

    getLoseContextExtension() {
      return loseContextExt;
    },

    dispose() {
      gl.deleteProgram(program);
      gl.deleteBuffer(quadBuffer);
      gl.deleteTexture(texA);
      gl.deleteTexture(texB);
      gl.deleteFramebuffer(fboA);
      gl.deleteFramebuffer(fboB);
    },
  };

  engine.resize(width, height);

  return {
    success: true,
    engine,
  };
}
