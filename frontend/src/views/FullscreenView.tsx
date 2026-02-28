/**
 * Fullscreen view of a single tile.
 * Placeholder/minimal until wor-bhzq (Fullscreen tile view component).
 * Route: /tile/:id
 */
import type { ReactElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useShaderContext } from "../shader-context.js";
import { Tile } from "../Tile.jsx";

export function FullscreenView(): ReactElement {
  const { id } = useParams<"id">();
  const navigate = useNavigate();
  const { shaders, loading } = useShaderContext();

  const shader = id ? shaders.find((s) => s.id === id) : null;

  if (loading) {
    return (
      <div className="fullscreen" role="main" data-testid="fullscreen-view">
        <p>Loading…</p>
      </div>
    );
  }

  if (!shader) {
    return (
      <div className="fullscreen" role="main" data-testid="fullscreen-view">
        <button
          type="button"
          className="fullscreen-close"
          aria-label="Close"
          onClick={() => navigate("/")}
        >
          ×
        </button>
        <p>Tile not found</p>
      </div>
    );
  }

  return (
    <div className="fullscreen" role="main" data-testid="fullscreen-view">
      <button
        type="button"
        className="fullscreen-close"
        aria-label="Close"
        onClick={() => navigate(-1)}
      >
        ×
      </button>
      <button
        type="button"
        className="fullscreen-close"
        aria-label="Edit"
        style={{ top: "0.5rem", right: "3rem" }}
        onClick={() => navigate(`/tile/${shader.id}/edit`)}
      >
        ✎
      </button>
      <Tile
        shader={shader}
        priority="fullscreen"
        onClick={() => {}}
        onDelete={undefined}
        isBuiltin={false}
      />
    </div>
  );
}
