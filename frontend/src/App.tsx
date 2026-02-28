import { useCallback, useState, type ReactElement } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import type { ShaderStorage } from "./storage.js";
import { ToastProvider } from "./toast-context.js";
import { ShaderProvider, useShaderContext, useDeleteShader } from "./shader-context.js";
import { TileGrid } from "./TileGrid.jsx";
import { AddTileDialog } from "./AddTileDialog.jsx";
import { FullscreenViewRoute } from "./views/FullscreenView.jsx";
import { EditViewRoute } from "./views/EditViewRoute.jsx";

export interface AppProps {
  /** Optional storage for tests. Uses IndexedDB when omitted. */
  storage?: ShaderStorage;
}

/**
 * Grid view with TileGrid. Uses ShaderProvider for state.
 * onTileClick navigates to /tile/:id (fullscreen).
 * onAddTile opens AddTileDialog.
 */
function GridView(): ReactElement {
  const navigate = useNavigate();
  const { shaders, loading } = useShaderContext();
  const { deleteShader } = useDeleteShader();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const onTileClick = useCallback(
    (id: string) => {
      navigate(`/tile/${id}`);
    },
    [navigate]
  );

  const onTileDelete = useCallback(
    async (id: string) => {
      try {
        await deleteShader(id);
      } catch {
        // Built-in tiles throw; TileGrid doesn't pass onDelete for those
      }
    },
    [deleteShader]
  );

  const onAddTile = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  if (loading) {
    return (
      <div id="app-root" data-react-root data-testid="grid-view">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div id="app-root" data-react-root data-testid="grid-view">
      <TileGrid
        shaders={shaders}
        onTileClick={onTileClick}
        onTileDelete={onTileDelete}
        onAddTile={onAddTile}
      />
      <AddTileDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
      />
    </div>
  );
}

/**
 * Minimal layout shell. Renders route content.
 */
function AppLayout(): ReactElement {
  return (
    <main id="app-shell">
      <Routes>
        <Route path="/" element={<GridView />} />
        <Route path="/tile/:id" element={<FullscreenViewRoute />} />
        <Route path="/tile/:id/edit" element={<EditViewRoute />} />
      </Routes>
    </main>
  );
}

/**
 * Root component with React Router. ShaderProvider and ToastProvider wrap all routes.
 * Routes: / (TileGrid), /tile/:id (fullscreen), /tile/:id/edit (edit).
 */
export function App({ storage }: AppProps = {}): ReactElement {
  return (
    <ToastProvider>
      <ShaderProvider storage={storage}>
        <AppLayout />
      </ShaderProvider>
    </ToastProvider>
  );
}
