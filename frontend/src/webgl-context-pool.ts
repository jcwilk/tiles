/**
 * WebGLContextPool: manages WebGL2 context allocation with hard cap.
 * Uses WEBGL_lose_context to free slots when evicting or releasing.
 * Priority: fullscreen > visible > off-screen (LRU within tier).
 */
type Priority = "fullscreen" | "visible" | "offscreen";

interface Entry {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  lastVisible: number;
  priority: Priority;
}

const DEFAULT_MAX = 8;
const MOBILE_MAX = 4;

function isMobileOrLowCapability(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints > 0;
  return isMobile;
}

function loseContext(canvas: HTMLCanvasElement): void {
  try {
    const gl = canvas.getContext("webgl2");
    if (!gl) return;
    const ext = gl.getExtension("WEBGL_lose_context") as { loseContext(): void } | null;
    ext?.loseContext();
  } catch {
    /* jsdom or unsupported */
  }
}

function evictionScore(e: Entry): number {
  const tier = e.priority === "fullscreen" ? 3 : e.priority === "visible" ? 2 : 1;
  return tier * 1e12 - e.lastVisible;
}

export interface WebGLContextPoolOptions {
  maxContexts?: number;
}

export class WebGLContextPool {
  private entries: Entry[] = [];
  private maxContexts: number;

  constructor(options: WebGLContextPoolOptions = {}) {
    const base = isMobileOrLowCapability() ? MOBILE_MAX : DEFAULT_MAX;
    this.maxContexts = options.maxContexts ?? base;
  }

  /**
   * Acquire a WebGL2 context for the canvas. Evicts lowest-priority context if at cap.
   */
  acquire(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
    while (this.entries.length >= this.maxContexts) {
      const victim = this.entries.reduce((a, b) =>
        evictionScore(a) < evictionScore(b) ? a : b
      );
      loseContext(victim.canvas);
      const idx = this.entries.indexOf(victim);
      if (idx >= 0) this.entries.splice(idx, 1);
    }

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });

    if (!gl) return null;

    this.entries.push({
      canvas,
      gl,
      lastVisible: Date.now(),
      priority: "visible",
    });
    return gl;
  }

  /**
   * Release the context for the canvas (loseContext and free slot).
   */
  release(canvas: HTMLCanvasElement): void {
    loseContext(canvas);
    const idx = this.entries.findIndex((e) => e.canvas === canvas);
    if (idx >= 0) this.entries.splice(idx, 1);
  }

  /**
   * Mark canvas as visible (viewport or focus).
   */
  markVisible(canvas: HTMLCanvasElement): void {
    const e = this.entries.find((x) => x.canvas === canvas);
    if (e) {
      e.lastVisible = Date.now();
      e.priority = "visible";
    }
  }

  /**
   * Mark canvas as off-screen (candidate for eviction).
   */
  markOffscreen(canvas: HTMLCanvasElement): void {
    const e = this.entries.find((x) => x.canvas === canvas);
    if (e) {
      e.lastVisible = 0;
      e.priority = "offscreen";
    }
  }

  /**
   * Mark canvas as fullscreen (never evicted).
   */
  markFullscreen(canvas: HTMLCanvasElement): void {
    const e = this.entries.find((x) => x.canvas === canvas);
    if (e) e.priority = "fullscreen";
  }

  /**
   * Mark multiple canvases as off-screen.
   */
  markOffscreenMany(canvases: HTMLCanvasElement[]): void {
    const set = new Set(canvases);
    for (const e of this.entries) {
      if (set.has(e.canvas)) {
        e.lastVisible = 0;
        e.priority = "offscreen";
      }
    }
  }

  /**
   * Dispose all contexts and reset.
   */
  dispose(): void {
    for (const e of this.entries) {
      loseContext(e.canvas);
    }
    this.entries.length = 0;
  }

  /** Active context count (for tests). */
  get activeCount(): number {
    return this.entries.length;
  }
}

let defaultPool: WebGLContextPool | null = null;

/**
 * Get the default pool instance. Created lazily.
 */
export function getDefaultPool(): WebGLContextPool {
  if (!defaultPool) defaultPool = new WebGLContextPool();
  return defaultPool;
}

/**
 * Reset default pool (for tests).
 */
export function resetDefaultPool(): void {
  defaultPool?.dispose();
  defaultPool = null;
}
