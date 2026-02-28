import { useCallback, useState, type ReactElement } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import type { ShaderStorage } from "./storage.js";
import { ToastProvider } from "./toast-context.js";
import { ShaderProvider, useShaderContext, useDeleteShader } from "./shader-context.js";
import { TileGrid } from "./TileGrid.jsx";
import { performAddFromPrompt } from "./add-from-prompt.js";
import { FullscreenView } from "./views/FullscreenView.jsx";
import { EditViewRoute } from "./views/EditViewRoute.jsx";

export interface AppProps {
  /** Optional storage for tests. Uses IndexedDB when omitted. */
  storage?: ShaderStorage;
}

/**
 * Grid view with TileGrid. Uses ShaderProvider for state.
 * onTileClick navigates to /tile/:id (fullscreen).
 * onAddTile: prompt + performAddFromPrompt.
 */
function GridView(): ReactElement {
  const navigate = useNavigate();
  const { shaders, loading, storage, refresh } = useShaderContext();
  const { deleteShader } = useDeleteShader();
  const [addTileLoading, setAddTileLoading] = useState(false);

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

  const onAddTile = useCallback(async () => {
    if (!storage) return;
    const prompt = window.prompt("Describe your shader (e.g. blue gradient, red plasma)");
    if (!prompt?.trim()) return;

    setAddTileLoading(true);
    const result = await performAddFromPrompt(prompt.trim(), storage);
    setAddTileLoading(false);
    if (result.success) await refresh();
  }, [storage, refresh]);

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
        addTileLoading={addTileLoading}
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
        <Route path="/tile/:id" element={<FullscreenView />} />
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
