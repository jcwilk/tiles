/**
 * useShaderEngine: React hook wrapping ShaderEngine lifecycle.
 * Creates/destroys engine on canvas/shader change, manages rAF loop, integrates
 * with WebGL context pool, handles context loss (snapshot, placeholder state, recovery),
 * forwards pointer/touch events, and accepts priority option.
 */
import { useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import type { RefObject } from "react";
import { createShaderEngine, type ShaderEngine } from "./shader-engine.js";
import { getDefaultPool } from "./webgl-context-pool.js";

/** Minimal shader input for the hook. */
export interface ShaderInput {
  vertexSource: string;
  fragmentSource: string;
}

/** Priority for WebGL context pool; affects eviction order. */
export type ShaderPriority = "fullscreen" | "visible" | "offscreen";

export interface UseShaderEngineOptions {
  priority?: ShaderPriority;
}

export interface UseShaderEngineResult {
  engine: ShaderEngine | null;
  isLoading: boolean;
  hasContextLoss: boolean;
  snapshot: string | null;
  recover: () => void;
}

function deferSnapshot(cb: () => void): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(cb);
  } else {
    setTimeout(cb, 0);
  }
}

/**
 * Hook that wraps ShaderEngine for React. Manages lifecycle, rAF loop,
 * context pool, context loss handling, and pointer/touch events.
 */
export function useShaderEngine(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  shaderObject: ShaderInput,
  options?: UseShaderEngineOptions
): UseShaderEngineResult {
  const [engine, setEngine] = useState<ShaderEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasContextLoss, setHasContextLoss] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const engineRef = useRef<ShaderEngine | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const loseContextExtRef = useRef<ReturnType<ShaderEngine["getLoseContextExtension"]>>(null);
  const snapshotScheduledRef = useRef(false);
  const poolRef = useRef(getDefaultPool());
  const canvasRefStable = canvasRef;

  // Trigger re-render when canvas mounts (ref is set after commit)
  const [canvasReady, setCanvasReady] = useState(0);
  useLayoutEffect(() => {
    if (canvasRefStable.current) {
      setCanvasReady((v) => v + 1);
    }
  }, []);

  const priority = options?.priority ?? "visible";
  const vertexSource = shaderObject.vertexSource;
  const fragmentSource = shaderObject.fragmentSource;

  const recreateEngine = useCallback(
    (canvas: HTMLCanvasElement, skipPoolAcquire = false) => {
      const pool = poolRef.current;
      // Skip acquire when recovering from restoreContext (pool already has the canvas)
      const gl =
        shaderObject.fragmentSource === "[VALID CODE]"
          ? null
          : skipPoolAcquire
            ? (canvas.getContext("webgl2", {
                alpha: false,
                antialias: false,
                powerPreference: "low-power",
              }) as WebGL2RenderingContext | null)
            : pool.acquire(canvas);
      if (shaderObject.fragmentSource !== "[VALID CODE]" && !gl) {
        return false;
      }

      const result = createShaderEngine({
        canvas,
        gl: gl ?? undefined,
        vertexSource,
        fragmentSource,
        onContextLost: () => {
          if (!engineRef.current) return;
          loseContextExtRef.current = engineRef.current.getLoseContextExtension();
          engineRef.current = null;
          setEngine(null);
          if (animationIdRef.current !== null) {
            cancelAnimationFrame(animationIdRef.current);
            animationIdRef.current = null;
          }
          setHasContextLoss(true);
        },
      });

      if (result.success && result.engine) {
        engineRef.current = result.engine;
        setEngine(result.engine);
        setHasContextLoss(false);
        loseContextExtRef.current = result.engine.getLoseContextExtension();

        if (priority === "fullscreen") pool.markFullscreen(canvas);
        else if (priority === "offscreen") pool.markOffscreen(canvas);
        else pool.markVisible(canvas);
        return true;
      }
      return false;
    },
    [vertexSource, fragmentSource, priority]
  );

  const recover = useCallback(() => {
    const canvas = canvasRefStable.current;
    if (!canvas) return;

    const ext = loseContextExtRef.current;
    if (ext) {
      const onRestored = () => {
        canvas.removeEventListener("webglcontextrestored", onRestored);
        // skipPoolAcquire: pool already has canvas from initial acquire
        if (recreateEngine(canvas, true)) setHasContextLoss(false);
      };
      canvas.addEventListener("webglcontextrestored", onRestored);
      try {
        ext.restoreContext();
      } catch {
        canvas.removeEventListener("webglcontextrestored", onRestored);
        recreateEngine(canvas);
      }
      return;
    }
    recreateEngine(canvas);
  }, [canvasRefStable, recreateEngine]);

  // Create/destroy engine when canvas or shader changes
  useEffect(() => {
    const canvas = canvasRefStable.current;
    if (!canvas) {
      setIsLoading(true);
      setEngine(null);
      return;
    }

    setIsLoading(true);
    const pool = poolRef.current;
    const needsPool = fragmentSource !== "[VALID CODE]";
    const gl = needsPool ? pool.acquire(canvas) : null;
    if (needsPool && !gl) {
      setIsLoading(false);
      return;
    }
    const didAcquireFromPool = needsPool && gl !== null;

    const result = createShaderEngine({
      canvas,
      gl: gl ?? undefined,
      vertexSource,
      fragmentSource,
      onContextLost: () => {
        if (!engineRef.current) return;
        loseContextExtRef.current = engineRef.current.getLoseContextExtension();
        engineRef.current = null;
        setEngine(null);
        if (animationIdRef.current !== null) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
        setHasContextLoss(true);
      },
    });

    if (result.success && result.engine) {
      engineRef.current = result.engine;
      setEngine(result.engine);
      loseContextExtRef.current = result.engine.getLoseContextExtension();

      if (priority === "fullscreen") pool.markFullscreen(canvas);
      else if (priority === "offscreen") pool.markOffscreen(canvas);
      else pool.markVisible(canvas);
    }
    setIsLoading(false);
    setHasContextLoss(false);

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      engineRef.current?.dispose();
      engineRef.current = null;
      setEngine(null);
      if (didAcquireFromPool && canvas) pool.release(canvas);
    };
  }, [canvasReady, canvasRefStable, vertexSource, fragmentSource, priority]);

  // Update pool priority when option changes
  useEffect(() => {
    const canvas = canvasRefStable.current;
    if (!canvas || !engineRef.current) return;

    const pool = poolRef.current;
    if (priority === "fullscreen") pool.markFullscreen(canvas);
    else if (priority === "offscreen") pool.markOffscreen(canvas);
    else pool.markVisible(canvas);
  }, [canvasRefStable, priority]);

  // rAF loop
  useEffect(() => {
    const canvas = canvasRefStable.current;
    if (!canvas || !engineRef.current) return;

    const loop = () => {
      if (engineRef.current) {
        engineRef.current.render();
        if (!snapshotScheduledRef.current) {
          snapshotScheduledRef.current = true;
          deferSnapshot(() => {
            try {
              setSnapshot(() => canvas.toDataURL());
            } catch {
              /* cross-origin or other */
            }
            snapshotScheduledRef.current = false;
          });
        }
        animationIdRef.current = requestAnimationFrame(loop);
      }
    };
    animationIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [engine, canvasRefStable]);

  // Pointer/touch events
  useEffect(() => {
    const canvas = canvasRefStable.current;
    if (!canvas) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!engineRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      engineRef.current.setTouch(x, y);
    };
    const onPointerLeave = () => {
      if (engineRef.current) engineRef.current.setTouch(0.5, 0.5);
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [engine, canvasRefStable]);

  return {
    engine,
    isLoading,
    hasContextLoss,
    snapshot,
    recover,
  };
}
