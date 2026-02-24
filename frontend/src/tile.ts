/**
 * Tile component: canvas + shader engine + touch handling.
 */
import type { ShaderObject } from "./types.js";
import { createShaderEngine, type ShaderEngine } from "./shader-engine.js";

export interface TileElement {
  element: HTMLElement;
  shader: ShaderObject;
  engine: ShaderEngine | null;
  animationId: number | null;
}

export function createTile(shader: ShaderObject): TileElement {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.dataset.shaderId = shader.id;

  const canvas = document.createElement("canvas");
  const label = document.createElement("span");
  label.className = "tile-label";
  label.textContent = shader.name;

  const result = createShaderEngine({
    canvas,
    vertexSource: shader.vertexSource,
    fragmentSource: shader.fragmentSource,
  });

  let engine: ShaderEngine | null = null;
  let animationId: number | null = null;

  if (result.success && result.engine) {
    engine = result.engine;
    tile.appendChild(canvas);
    tile.appendChild(label);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !engine) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        engine.resize(Math.floor(width), Math.floor(height));
      }
    });
    resizeObserver.observe(canvas);

    const loop = () => {
      if (engine) {
        engine.render();
        animationId = requestAnimationFrame(loop);
      }
    };
    animationId = requestAnimationFrame(loop);

    canvas.addEventListener("pointermove", (e) => {
      if (!engine) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      engine.setTouch(x, y);
    });
    canvas.addEventListener("pointerleave", () => {
      if (engine) engine.setTouch(0.5, 0.5);
    });
  } else {
    const err = document.createElement("div");
    err.className = "tile-error";
    err.textContent = result.compileError ?? result.linkError ?? "Shader failed to compile";
    tile.appendChild(err);
  }

  return {
    element: tile,
    shader,
    engine,
    animationId,
  };
}

export function disposeTile(tile: TileElement): void {
  if (tile.animationId !== null) {
    cancelAnimationFrame(tile.animationId);
  }
  tile.engine?.dispose();
}
