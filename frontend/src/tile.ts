/**
 * Tile component: canvas + shader engine + touch handling.
 * Handles WebGL context loss: snapshot on first render, placeholder on loss, click-to-recover.
 */
import type { ShaderObject } from "./types.js";
import { createShaderEngine, type ShaderEngine } from "./shader-engine.js";
import { makeRoom, register, unregister } from "./context-tracker.js";
import { showToast } from "./toast.js";

/** Defer snapshot capture; requestIdleCallback when available, else setTimeout. */
function deferSnapshot(cb: () => void): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(cb);
  } else {
    setTimeout(cb, 0);
  }
}

export interface TileElement {
  element: HTMLElement;
  shader: ShaderObject;
  engine: ShaderEngine | null;
  animationId: number | null;
  /** Canvas ref for context tracker unregister (may change on context-loss recovery). */
  canvasRef: { current: HTMLCanvasElement | null };
  /** Recreate engine if evicted. Call when closing fullscreen to restore grid tiles. */
  recreateEngineIfNeeded?: () => void;
}

export interface CreateTileOptions {
  onDelete?: () => void;
}

function createPlaceholder(snapshot: string | null): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "tile-paused";
  if (snapshot) {
    const img = document.createElement("img");
    img.src = snapshot;
    img.alt = "Paused shader";
    img.className = "tile-paused-snapshot";
    wrapper.appendChild(img);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "tile-paused-fallback";
    fallback.textContent = "Paused";
    wrapper.appendChild(fallback);
  }
  const overlay = document.createElement("div");
  overlay.className = "tile-paused-overlay";
  overlay.textContent = "Click to resume";
  wrapper.appendChild(overlay);
  return wrapper;
}

export function createTile(shader: ShaderObject, options?: CreateTileOptions): TileElement {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.dataset.shaderId = shader.id;

  const canvas = document.createElement("canvas");
  const label = document.createElement("span");
  label.className = "tile-label";
  label.textContent = shader.name;

  let snapshot: string | null = null;
  let snapshotScheduled = false;

  const engineRef = { current: null as ShaderEngine | null };
  const animationIdRef = { current: null as number | null };
  const loseContextExtRef = { current: null as ReturnType<ShaderEngine["getLoseContextExtension"]> };
  const canvasRef = { current: canvas };

  makeRoom();
  const result = createShaderEngine({
    canvas,
    vertexSource: shader.vertexSource,
    fragmentSource: shader.fragmentSource,
    onContextLost: () => {
      if (!engineRef.current) return;
      loseContextExtRef.current = engineRef.current.getLoseContextExtension();
      engineRef.current = null;
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      const placeholder = createPlaceholder(snapshot);
      placeholder.addEventListener("click", handleRecoverClick);
      canvas.replaceWith(placeholder);
      (tile as unknown as { _placeholder?: HTMLElement })._placeholder = placeholder;
    },
  });

  engineRef.current = result.success && result.engine ? result.engine : null;
  let engine: ShaderEngine | null = engineRef.current;
  let animationId: number | null = null;

  function handleRecoverClick(): void {
    const placeholder = (tile as unknown as { _placeholder?: HTMLElement })._placeholder;
    if (!placeholder) return;

    const ext = loseContextExtRef.current;
    if (ext) {
      const restoredCanvas = canvasRef.current;
      const onRestored = () => {
        restoredCanvas.removeEventListener("webglcontextrestored", onRestored);
        attemptRecreate(placeholder, restoredCanvas);
      };
      restoredCanvas.addEventListener("webglcontextrestored", onRestored);
      try {
        ext.restoreContext();
      } catch {
        restoredCanvas.removeEventListener("webglcontextrestored", onRestored);
        attemptRecreate(placeholder);
      }
      return;
    }
    attemptRecreate(placeholder);
  }

  function attemptRecreate(placeholder: HTMLElement, existingCanvas?: HTMLCanvasElement): void {
    const newCanvas = existingCanvas ?? document.createElement("canvas");
    const newResult = createShaderEngine({
      canvas: newCanvas,
      vertexSource: shader.vertexSource,
      fragmentSource: shader.fragmentSource,
      onContextLost: () => {
        if (!engineRef.current) return;
        loseContextExtRef.current = engineRef.current.getLoseContextExtension();
        engineRef.current = null;
        if (animationIdRef.current !== null) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
        const newPlaceholder = createPlaceholder(snapshot);
        newPlaceholder.addEventListener("click", handleRecoverClick);
        newCanvas.replaceWith(newPlaceholder);
        (tile as unknown as { _placeholder?: HTMLElement })._placeholder = newPlaceholder;
      },
    });

    if (newResult.success && newResult.engine) {
      delete (tile as unknown as { _placeholder?: HTMLElement })._placeholder;
      makeRoom();
      const onEvict = () => {
        engineRef.current = null;
        if (animationIdRef.current !== null) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
      };
      register(newCanvas, newResult.engine, onEvict);
      engineRef.current = newResult.engine;
      loseContextExtRef.current = newResult.engine.getLoseContextExtension();
      engine = newResult.engine;
      canvasRef.current = newCanvas;
      placeholder.replaceWith(newCanvas);

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !engineRef.current) return;
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engineRef.current.resize(Math.floor(width), Math.floor(height));
        }
      });
      resizeObserver.observe(newCanvas);

      newCanvas.addEventListener("pointermove", (e) => {
        if (!engineRef.current) return;
        const rect = newCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1 - (e.clientY - rect.top) / rect.height;
        engineRef.current!.setTouch(x, y);
      });
      newCanvas.addEventListener("pointerleave", () => {
        if (engineRef.current) engineRef.current.setTouch(0.5, 0.5);
      });

      const loop = () => {
        if (engineRef.current) {
          engineRef.current.render();
          if (!snapshotScheduled) {
            snapshotScheduled = true;
            deferSnapshot(() => {
              try {
                snapshot = newCanvas.toDataURL();
              } catch {
                // cross-origin or other
              }
            });
          }
          animationIdRef.current = requestAnimationFrame(loop);
        }
      };
      animationIdRef.current = requestAnimationFrame(loop);
    } else {
      showToast("Too many active shaders — close some tiles");
    }
  }

  if (result.success && result.engine) {
    engine = result.engine;
    const onEvict = () => {
      engineRef.current = null;
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
    register(canvas, result.engine, onEvict);
    tile.appendChild(canvas);
    tile.appendChild(label);

    if (options?.onDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "tile-delete";
      deleteBtn.setAttribute("aria-label", "Delete tile");
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        options.onDelete?.();
      });
      tile.appendChild(deleteBtn);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !engineRef.current) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        engineRef.current.resize(Math.floor(width), Math.floor(height));
      }
    });
    resizeObserver.observe(canvas);

    const loop = () => {
      if (engineRef.current) {
        engineRef.current.render();
        if (!snapshotScheduled) {
          snapshotScheduled = true;
          deferSnapshot(() => {
            try {
              snapshot = canvas.toDataURL();
            } catch {
              // cross-origin or other
            }
          });
        }
        animationIdRef.current = requestAnimationFrame(loop);
      }
    };
    animationId = requestAnimationFrame(loop);
    animationIdRef.current = animationId;

    canvas.addEventListener("pointermove", (e) => {
      if (!engineRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      engineRef.current.setTouch(x, y);
    });
    canvas.addEventListener("pointerleave", () => {
      if (engineRef.current) engineRef.current.setTouch(0.5, 0.5);
    });
  } else {
    const err = document.createElement("div");
    err.className = "tile-error";
    err.textContent = result.compileError ?? result.linkError ?? "Shader failed to compile";
    tile.appendChild(err);

    if (options?.onDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "tile-delete";
      deleteBtn.setAttribute("aria-label", "Delete tile");
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        options.onDelete?.();
      });
      tile.appendChild(deleteBtn);
    }
  }

  const recreateEngineIfNeeded = (): void => {
    if (engineRef.current || !canvasRef.current) return;
    const c = canvasRef.current;
    if (!c.isConnected) return;
    makeRoom();
    const newResult = createShaderEngine({
      canvas: c,
      vertexSource: shader.vertexSource,
      fragmentSource: shader.fragmentSource,
      onContextLost: () => {
        if (!engineRef.current) return;
        loseContextExtRef.current = engineRef.current.getLoseContextExtension();
        engineRef.current = null;
        if (animationIdRef.current !== null) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }
        const newPlaceholder = createPlaceholder(snapshot);
        newPlaceholder.addEventListener("click", handleRecoverClick);
        c.replaceWith(newPlaceholder);
        (tile as unknown as { _placeholder?: HTMLElement })._placeholder = newPlaceholder;
      },
    });
    if (!newResult.success || !newResult.engine) return;
    const onEvict = () => {
      engineRef.current = null;
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
    register(c, newResult.engine, onEvict);
    engineRef.current = newResult.engine;
    loseContextExtRef.current = newResult.engine.getLoseContextExtension();
    const loop = () => {
      if (engineRef.current) {
        engineRef.current.render();
        if (!snapshotScheduled) {
          snapshotScheduled = true;
          deferSnapshot(() => {
            try {
              snapshot = c.toDataURL();
            } catch {
              /* cross-origin or other */
            }
          });
        }
        animationIdRef.current = requestAnimationFrame(loop);
      }
    };
    animationIdRef.current = requestAnimationFrame(loop);
  };

  return {
    element: tile,
    shader,
    engine,
    animationId,
    canvasRef,
    recreateEngineIfNeeded,
  };
}

export function disposeTile(tile: TileElement): void {
  if (tile.animationId !== null) {
    cancelAnimationFrame(tile.animationId);
  }
  if (tile.canvasRef.current) {
    unregister(tile.canvasRef.current);
  }
  tile.engine?.dispose();
}

/** Placeholder tile shown while a merge is in progress. */
export function createLoadingTile(): HTMLElement {
  const tile = document.createElement("div");
  tile.className = "tile tile-loading";
  tile.dataset.shaderId = "loading";

  const spinner = document.createElement("div");
  spinner.className = "tile-loading-spinner";
  const label = document.createElement("span");
  label.className = "tile-label";
  label.textContent = "Merging…";

  tile.appendChild(spinner);
  tile.appendChild(label);
  return tile;
}
