import { useCallback, useState, type ReactElement } from "react";
import type { ShaderStorage } from "./storage.js";
import { ToastProvider } from "./toast-context.js";
import { ShaderProvider, useShaderContext, useDeleteShader } from "./shader-context.js";
import { TileGrid } from "./TileGrid.jsx";
import { performAddFromPrompt } from "./add-from-prompt.js";

export interface AppProps {
  /** Optional storage for tests. Uses IndexedDB when omitted. */
  storage?: ShaderStorage;
}

/**
 * Grid view with TileGrid. Uses ShaderProvider for state.
 * onTileClick: placeholder until fullscreen component (wor-bhzq).
 * onAddTile: prompt + performAddFromPrompt.
 */
function AppContent(): ReactElement {
  const { shaders, loading, storage, refresh } = useShaderContext();
  const { deleteShader } = useDeleteShader();
  const [addTileLoading, setAddTileLoading] = useState(false);

  const onTileClick = useCallback((_id: string) => {
    // Fullscreen handled by wor-bhzq
  }, []);

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
      <div id="app-root" data-react-root>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div id="app-root" data-react-root>
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
 * Minimal root component for React migration.
 */
export function App({ storage }: AppProps = {}): ReactElement {
  return (
    <ToastProvider>
      <ShaderProvider storage={storage}>
        <AppContent />
      </ShaderProvider>
    </ToastProvider>
  );
}
