/**
 * Tile React component.
 * Renders a single shader tile with canvas, useShaderEngine, context-loss placeholder,
 * delete button, and click-to-expand. Uses useVisibility to auto-set priority in grid mode.
 */
import { useRef, useEffect, useCallback, useMemo, memo, type ReactElement } from "react";
import type { ShaderObject } from "./types.js";
import { useShaderEngine, type ShaderPriority } from "./useShaderEngine.js";
import { useVisibility } from "./useVisibility.js";

export interface TileProps {
  shader: ShaderObject;
  priority?: ShaderPriority;
  onClick?: () => void;
  onDelete?: () => void;
  isBuiltin?: boolean;
  className?: string;
}

function TileInner({
  shader,
  priority: priorityProp,
  onClick,
  onDelete,
  isBuiltin = false,
  className,
}: TileProps): ReactElement {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { isVisible } = useVisibility(wrapperRef);
  const effectivePriority: ShaderPriority =
    priorityProp ?? (isVisible ? "visible" : "offscreen");

  const shaderInput = useMemo(
    () => ({
      vertexSource: shader.vertexSource,
      fragmentSource: shader.fragmentSource,
    }),
    [shader.vertexSource, shader.fragmentSource]
  );

  const {
    engine,
    isLoading,
    hasContextLoss,
    snapshot,
    recover,
  } = useShaderEngine(canvasRef, shaderInput, { priority: effectivePriority });

  // Resize canvas and engine when tile container size changes
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || !engine) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !engine) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        engine.resize(Math.floor(width), Math.floor(height));
      }
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [engine]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest?.(".tile-delete")) return;
      onClick?.();
    },
    [onClick]
  );

  const handleRecoverClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      recover();
    },
    [recover]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete?.();
    },
    [onDelete]
  );

  const showDelete = !isBuiltin && onDelete;
  const showError = !isLoading && !engine && !hasContextLoss;
  const errorMessage =
    shader.fragmentSource === "[VALID CODE]"
      ? "Too many active shaders — close some tiles"
      : "Shader failed to load";

  const classNames = ["tile", className].filter(Boolean).join(" ");

  return (
    <div
      ref={wrapperRef}
      className={classNames}
      data-shader-id={shader.id}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (hasContextLoss) handleRecoverClick(e as unknown as React.MouseEvent);
          else onClick?.();
        }
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: hasContextLoss ? "none" : undefined }}
      />
      {hasContextLoss && (
        <div
          className="tile-paused"
          onClick={handleRecoverClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              recover();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Click to resume"
        >
          {snapshot ? (
            <img
              src={snapshot}
              alt="Paused shader"
              className="tile-paused-snapshot"
            />
          ) : (
            <div className="tile-paused-fallback">Paused</div>
          )}
          <div className="tile-paused-overlay">Click to resume</div>
        </div>
      )}
      {showError && <div className="tile-error">{errorMessage}</div>}
      <span className="tile-label">{shader.name}</span>
      {showDelete && (
        <button
          type="button"
          className="tile-delete"
          onClick={handleDeleteClick}
          aria-label="Delete tile"
        >
          ×
        </button>
      )}
    </div>
  );
}

export const Tile = memo(TileInner);
