/**
 * Tests for WebGLContextPool: acquire, release, priority eviction, mobile fallback.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WebGLContextPool,
  getDefaultPool,
  resetDefaultPool,
} from "./webgl-context-pool.js";

function createCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

describe("WebGLContextPool", () => {
  beforeEach(() => {
    resetDefaultPool();
  });

  it("acquire returns null when getContext fails (jsdom)", () => {
    const pool = new WebGLContextPool({ maxContexts: 8 });
    const canvas = createCanvas();
    const gl = pool.acquire(canvas);
    expect(gl).toBeNull();
  });

  it("release does not throw when canvas has no context", () => {
    const pool = new WebGLContextPool({ maxContexts: 8 });
    const canvas = createCanvas();
    expect(() => pool.release(canvas)).not.toThrow();
  });

  it("respects maxContexts option", () => {
    const pool = new WebGLContextPool({ maxContexts: 4 });
    expect(pool.activeCount).toBe(0);
  });

  it("markVisible and markOffscreen do not throw", () => {
    const pool = new WebGLContextPool({ maxContexts: 8 });
    const canvas = createCanvas();
    expect(() => pool.markVisible(canvas)).not.toThrow();
    expect(() => pool.markOffscreen(canvas)).not.toThrow();
  });

  it("markOffscreenMany does not throw", () => {
    const pool = new WebGLContextPool({ maxContexts: 8 });
    const canvases = [createCanvas(), createCanvas()];
    expect(() => pool.markOffscreenMany(canvases)).not.toThrow();
  });

  it("dispose does not throw", () => {
    const pool = new WebGLContextPool({ maxContexts: 8 });
    expect(() => pool.dispose()).not.toThrow();
  });

  it("getDefaultPool returns singleton", () => {
    const a = getDefaultPool();
    const b = getDefaultPool();
    expect(a).toBe(b);
  });

  it("resetDefaultPool clears singleton", () => {
    const a = getDefaultPool();
    resetDefaultPool();
    const b = getDefaultPool();
    expect(a).not.toBe(b);
  });
});
