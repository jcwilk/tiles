/**
 * Fullscreen view of a single tile.
 * Route: /tile/:id — use FullscreenViewRoute for route integration.
 */
import { useEffect, useCallback, type ReactElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useShaders, useDeleteShader } from "../shader-context.js";
import { isBuiltInTile } from "../builtin.js";
import { Tile } from "../Tile.jsx";

export interface FullscreenViewProps {
  shaderId: string;
}

/**
 * FullscreenView renders a single shader tile in full-viewport with close, edit,
 * and delete (for non-builtin) actions. Uses useShaders() for lookup. Redirects
 * to grid when shaderId doesn't match any shader. Tile uses priority='fullscreen'.
 */
export function FullscreenView({ shaderId }: FullscreenViewProps): ReactElement {
  const navigate = useNavigate();
  const { shaders, loading } = useShaders();
  const { deleteShader } = useDeleteShader();

  const shader = shaders.find((s) => s.id === shaderId);

  // Redirect to grid when shader doesn't exist (after load)
  useEffect(() => {
    if (!loading && !shader) {
      navigate("/", { replace: true });
    }
  }, [loading, shader, navigate]);

  const handleClose = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/tile/${shaderId}/edit`);
  }, [navigate, shaderId]);

  const handleDelete = useCallback(async () => {
    await deleteShader(shaderId);
    navigate("/");
  }, [deleteShader, shaderId, navigate]);

  if (loading) {
    return (
      <div className="fullscreen" role="main" data-testid="fullscreen-view">
        <p>Loading…</p>
      </div>
    );
  }

  // Redirecting — render nothing briefly to avoid flash
  if (!shader) {
    return (
      <div className="fullscreen" role="main" data-testid="fullscreen-view">
        <p>Loading…</p>
      </div>
    );
  }

  const isBuiltin = isBuiltInTile(shader);

  return (
    <div className="fullscreen" role="main" data-testid="fullscreen-view">
      <button
        type="button"
        className="fullscreen-close"
        aria-label="Close"
        onClick={handleClose}
      >
        ×
      </button>
      <button
        type="button"
        className="fullscreen-close"
        aria-label="Edit"
        style={{ top: "0.5rem", right: "3rem" }}
        onClick={handleEdit}
      >
        ✎
      </button>
      <Tile
        shader={shader}
        priority="fullscreen"
        onClick={() => {}}
        onDelete={isBuiltin ? undefined : handleDelete}
        isBuiltin={isBuiltin}
      />
    </div>
  );
}

/**
 * Route wrapper: reads :id from params and passes to FullscreenView.
 */
export function FullscreenViewRoute(): ReactElement | null {
  const { id } = useParams<"id">();
  if (!id) return null;
  return <FullscreenView shaderId={id} />;
}
