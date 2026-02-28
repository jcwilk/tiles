/**
 * Edit view for a tile.
 * Placeholder/minimal until wor-wzar (Add tile flow component).
 * Route: /tile/:id/edit
 */
import type { ReactElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useShaderContext } from "../shader-context.js";

export function EditViewRoute(): ReactElement {
  const { id } = useParams<"id">();
  const navigate = useNavigate();
  const { shaders, loading } = useShaderContext();

  const shader = id ? shaders.find((s) => s.id === id) : null;

  if (loading) {
    return (
      <div className="edit-view" role="main" data-testid="edit-view">
        <p>Loading…</p>
      </div>
    );
  }

  if (!shader) {
    return (
      <div className="edit-view" role="main" data-testid="edit-view">
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
    <div className="edit-view" role="main" data-testid="edit-view">
      <button
        type="button"
        className="fullscreen-close"
        aria-label="Close"
        onClick={() => navigate(-1)}
      >
        ×
      </button>
      <p>Edit: {shader.id}</p>
    </div>
  );
}
