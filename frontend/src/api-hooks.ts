/**
 * API integration hooks.
 * Wraps api.ts HTTP layer with loading/error state, compile-retry logic,
 * and integration with useAddShader / useToast.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { generateFromPrompt, applyDirective, fetchSuggestion } from "./api.js";
import type { Adventurousness } from "./api.js";
import { compileCheck } from "./validation-context.js";
import { useAddShader } from "./shader-context.js";
import { useToast } from "./toast-context.js";
import type { ShaderObject } from "./types.js";

const MAX_ATTEMPTS = 3;

const DEFAULT_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  const m = s.match(/^```(?:glsl)?\s*\n?([\s\S]*?)\n?```\s*$/m);
  if (m) return m[1].trim();
  return s.replace(/^```(?:glsl)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export interface UseGenerateFromPromptResult {
  execute: (prompt: string) => Promise<void>;
  data: ShaderObject | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function useGenerateFromPrompt(): UseGenerateFromPromptResult {
  const { addShader } = useAddShader();
  const { showToast } = useToast();
  const [data, setData] = useState<ShaderObject | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;

      setError(undefined);
      setData(undefined);
      setIsLoading(true);

      let previousError: string | undefined;

      try {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (signal.aborted || controllerRef.current !== controller) return;

          const { fragmentSource: raw } = await generateFromPrompt(
            trimmed,
            previousError,
            signal
          );
          if (signal.aborted || controllerRef.current !== controller) return;
          const fragmentSource = raw.trim();

          const result = compileCheck(fragmentSource, DEFAULT_VERTEX);

          if (result.ok) {
            if (signal.aborted || controllerRef.current !== controller) return;
            const shader: ShaderObject = {
              id: crypto.randomUUID(),
              name: trimmed.slice(0, 50),
              vertexSource: DEFAULT_VERTEX,
              fragmentSource,
              createdAt: Date.now(),
            };
            await addShader(shader);
            if (signal.aborted || controllerRef.current !== controller) return;
            setData(shader);
            return;
          }

          previousError = result.compileError ?? result.linkError ?? "Unknown compilation error";
        }

        if (signal.aborted || controllerRef.current !== controller) return;
        const err = new Error("Shader failed to compile after 3 attempts. Please try again.");
        setError(err);
        showToast(err.message, { type: "error" });
      } catch (err) {
        if (isAbortError(err) || signal.aborted || controllerRef.current !== controller) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        const e = err instanceof Error ? err : new Error(message);
        setError(e);
        showToast(`Generation failed: ${message}`, { type: "error" });
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [addShader, showToast]
  );

  return { execute, data, isLoading, error };
}

export interface SuggestionData {
  conservative?: string;
  moderate?: string;
  wild?: string;
}

export interface LoadingByTier {
  conservative: boolean;
  moderate: boolean;
  wild: boolean;
}

export interface UseFetchSuggestionsResult {
  execute: (fragmentSource: string) => Promise<void>;
  abort: () => void;
  data: SuggestionData;
  isLoading: boolean;
  loadingByTier: LoadingByTier;
  error: Error | undefined;
}

const TIERS: Adventurousness[] = ["conservative", "moderate", "wild"];

export function useFetchSuggestions(): UseFetchSuggestionsResult {
  const { showToast } = useToast();
  const [data, setData] = useState<SuggestionData>({});
  const [loadingByTier, setLoadingByTier] = useState<LoadingByTier>({
    conservative: false,
    moderate: false,
    wild: false,
  });
  const [error, setError] = useState<Error | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  useEffect(() => abort, [abort]);

  const execute = useCallback(
    async (fragmentSource: string) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;

      setError(undefined);
      setData({});
      setLoadingByTier({ conservative: true, moderate: true, wild: true });

      const promises = TIERS.map(async (tier) => {
        try {
          if (signal.aborted || controllerRef.current !== controller) return "aborted";
          const { suggestion } = await fetchSuggestion(fragmentSource, tier, signal);
          if (signal.aborted || controllerRef.current !== controller) return "aborted";
          setData((prev) => ({ ...prev, [tier]: suggestion }));
          return tier;
        } catch (err) {
          if (isAbortError(err) || signal.aborted || controllerRef.current !== controller) {
            return "aborted";
          }
          const message = err instanceof Error ? err.message : "Unknown error";
          showToast(`Suggestion (${tier}) failed: ${message}`, { type: "error" });
          return null;
        } finally {
          if (controllerRef.current === controller) {
            setLoadingByTier((prev) => ({ ...prev, [tier]: false }));
          }
        }
      });

      const results = await Promise.all(promises);
      if (signal.aborted || controllerRef.current !== controller) return;
      const allFailed = results.every((r) => r === null);
      if (allFailed) {
        setError(new Error("All suggestion requests failed"));
      }

      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    },
    [showToast]
  );

  const isLoading = loadingByTier.conservative || loadingByTier.moderate || loadingByTier.wild;

  return { execute, abort, data, isLoading, loadingByTier, error };
}

export interface UseApplyDirectiveResult {
  execute: (shader: ShaderObject, directive: string, contextShaders?: ShaderObject[]) => Promise<void>;
  data: ShaderObject | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export function useApplyDirective(): UseApplyDirectiveResult {
  const { addShader } = useAddShader();
  const { showToast } = useToast();
  const [data, setData] = useState<ShaderObject | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const execute = useCallback(
    async (shader: ShaderObject, directive: string, contextShaders?: ShaderObject[]) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;

      const fragmentSource = shader.fragmentSource;
      const contextCodes = contextShaders?.map((s) => s.fragmentSource) ?? [];

      setError(undefined);
      setData(undefined);
      setIsLoading(true);

      let previousError: string | undefined;

      try {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          if (signal.aborted || controllerRef.current !== controller) return;
          const { fragmentSource: raw } = await applyDirective(
            fragmentSource,
            directive,
            contextCodes.length > 0 ? contextCodes : undefined,
            previousError,
            signal
          );
          if (signal.aborted || controllerRef.current !== controller) return;
          const newFragmentSource = stripMarkdownFences(raw);

          const result = compileCheck(newFragmentSource, DEFAULT_VERTEX);

          if (result.ok) {
            if (signal.aborted || controllerRef.current !== controller) return;
            const name = directive.slice(0, 50) + (directive.length > 50 ? "…" : "");
            const newShader: ShaderObject = {
              id: crypto.randomUUID(),
              name,
              vertexSource: DEFAULT_VERTEX,
              fragmentSource: newFragmentSource,
              createdAt: Date.now(),
            };
            await addShader(newShader);
            if (signal.aborted || controllerRef.current !== controller) return;
            setData(newShader);
            return;
          }

          previousError = result.compileError ?? result.linkError ?? "Unknown compilation error";
        }

        if (signal.aborted || controllerRef.current !== controller) return;
        const err = new Error("Shader failed to compile after 3 attempts. Please try again.");
        setError(err);
        showToast(err.message, { type: "error" });
      } catch (err) {
        if (isAbortError(err) || signal.aborted || controllerRef.current !== controller) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        const e = err instanceof Error ? err : new Error(message);
        setError(e);
        showToast(`Apply directive failed: ${message}`, { type: "error" });
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [addShader, showToast]
  );

  return { execute, data, isLoading, error };
}
