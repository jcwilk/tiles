/**
 * Shader state management context and hooks.
 * Wraps the IndexedDB storage layer with React-friendly state.
 * Supports in-memory storage for tests.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { ShaderObject } from "./types.js";
import type { ShaderStorage } from "./storage.js";
import { createIndexedDBStorage } from "./storage.js";
import { seedIfEmpty } from "./seed.js";
import { isBuiltInTile } from "./builtin.js";

/** Return type for useShaders() */
export interface UseShadersResult {
  shaders: ShaderObject[];
  loading: boolean;
}

/** Return type for useAddShader() */
export interface UseAddShaderResult {
  addShader: (shader: ShaderObject) => Promise<void>;
}

/** Return type for useDeleteShader() */
export interface UseDeleteShaderResult {
  deleteShader: (id: string) => Promise<void>;
}

export interface ShaderContextValue {
  shaders: ShaderObject[];
  loading: boolean;
  storage: ShaderStorage | null;
  refresh: () => Promise<void>;
}

const ShaderContext = createContext<ShaderContextValue | null>(null);

export interface ShaderProviderProps {
  children: ReactNode;
  /** Optional storage instance. When omitted, uses IndexedDB. Pass createInMemoryStorage() for tests. */
  storage?: ShaderStorage;
}

/**
 * ShaderProvider renders children and initializes storage.
 * Runs seeding when storage is empty. Exposes shader list reactively.
 */
export function ShaderProvider({
  children,
  storage: storageProp,
}: ShaderProviderProps): ReactNode {
  const [shaders, setShaders] = useState<ShaderObject[]>([]);
  const [loading, setLoading] = useState(true);
  const storage = storageProp ?? createIndexedDBStorage();

  const refresh = useCallback(async () => {
    if (!storage) return;
    const all = await storage.getAll();
    setShaders(all);
  }, [storage]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!storage) return;
      setLoading(true);
      await seedIfEmpty(storage);
      if (cancelled) return;
      const all = await storage.getAll();
      if (!cancelled) setShaders(all);
      setLoading(false);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const value: ShaderContextValue = {
    shaders,
    loading,
    storage,
    refresh,
  };

  return (
    <ShaderContext.Provider value={value}>{children}</ShaderContext.Provider>
  );
}

/**
 * Returns the full shader context (shaders, loading, storage, refresh).
 * Use when you need storage or refresh (e.g. performAddFromPrompt).
 */
export function useShaderContext(): ShaderContextValue {
  const ctx = useContext(ShaderContext);
  if (!ctx) {
    throw new Error("useShaderContext must be used within ShaderProvider");
  }
  return ctx;
}

/**
 * Returns the shader list and loading state. Updates when shaders are added/deleted.
 */
export function useShaders(): UseShadersResult {
  const ctx = useContext(ShaderContext);
  if (!ctx) {
    throw new Error("useShaders must be used within ShaderProvider");
  }
  return {
    shaders: ctx.shaders,
    loading: ctx.loading,
  };
}

/**
 * Adds a shader, persists to storage, and updates context.
 */
export function useAddShader(): UseAddShaderResult {
  const ctx = useContext(ShaderContext);
  if (!ctx) {
    throw new Error("useAddShader must be used within ShaderProvider");
  }

  const addShader = useCallback(
    async (shader: ShaderObject) => {
      if (!ctx.storage) return;
      await ctx.storage.add(shader);
      await ctx.refresh();
    },
    [ctx.storage, ctx.refresh]
  );

  return { addShader };
}

/**
 * Deletes a shader and updates context. Built-in shaders cannot be deleted.
 */
export function useDeleteShader(): UseDeleteShaderResult {
  const ctx = useContext(ShaderContext);
  if (!ctx) {
    throw new Error("useDeleteShader must be used within ShaderProvider");
  }

  const deleteShader = useCallback(
    async (id: string) => {
      const shader = ctx.shaders.find((s) => s.id === id);
      if (shader && isBuiltInTile(shader)) {
        throw new Error("Built-in shaders cannot be deleted");
      }
      if (!ctx.storage) return;
      await ctx.storage.delete(id);
      await ctx.refresh();
    },
    [ctx.storage, ctx.shaders, ctx.refresh]
  );

  return { deleteShader };
}
