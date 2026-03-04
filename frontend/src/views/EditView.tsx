/**
 * Edit view React component.
 * Shows shader preview, AI suggestions, custom directive input, and context shader selection.
 */
import { useEffect, useCallback, useState, useMemo, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useShaders } from "../shader-context.js";
import {
  useFetchSuggestions,
  useApplyDirective,
  type LoadingByTier,
  type SuggestionData,
} from "../api-hooks.js";
import { Tile } from "../Tile.jsx";
import { SuggestionCard, type SuggestionTier } from "./SuggestionCard.jsx";
import { DirectiveInput } from "./DirectiveInput.jsx";
import { ContextShaderPicker } from "./ContextShaderPicker.jsx";
import styles from "./EditView.module.css";

const TIERS: SuggestionTier[] = ["conservative", "moderate", "wild"];
const SUGGESTION_DEBOUNCE_MS = 400;
const SUGGESTION_CACHE_MAX_ENTRIES = 20;
const IDLE_LOADING_BY_TIER: LoadingByTier = {
  conservative: false,
  moderate: false,
  wild: false,
};

const suggestionsCache = new Map<string, SuggestionData>();

function hashFragmentSource(fragmentSource: string): string {
  let hash = 2166136261;
  for (let i = 0; i < fragmentSource.length; i += 1) {
    hash ^= fragmentSource.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function hasAllTierSuggestions(data: SuggestionData): boolean {
  return TIERS.every((tier) => typeof data[tier] === "string" && data[tier]!.trim().length > 0);
}

function getCachedSuggestions(sourceHash: string): SuggestionData | null {
  const cached = suggestionsCache.get(sourceHash);
  if (!cached) return null;

  // Promote cache hit to most-recently-used.
  suggestionsCache.delete(sourceHash);
  suggestionsCache.set(sourceHash, cached);
  return cached;
}

function setCachedSuggestions(sourceHash: string, data: SuggestionData): void {
  if (suggestionsCache.has(sourceHash)) {
    suggestionsCache.delete(sourceHash);
  }
  suggestionsCache.set(sourceHash, { ...data });

  if (suggestionsCache.size > SUGGESTION_CACHE_MAX_ENTRIES) {
    const oldest = suggestionsCache.keys().next().value;
    if (oldest) {
      suggestionsCache.delete(oldest);
    }
  }
}

export function __resetSuggestionCacheForTests(): void {
  suggestionsCache.clear();
}

export interface EditViewProps {
  shaderId: string;
}

export function EditView({ shaderId }: EditViewProps): ReactElement {
  const navigate = useNavigate();
  const { shaders, loading } = useShaders();
  const {
    execute: fetchSuggestions,
    abort: abortSuggestions,
    data: suggestionsData,
    loadingByTier,
  } = useFetchSuggestions();
  const { execute: applyDirective, data: appliedShader, isLoading: isApplying } = useApplyDirective();

  const [selectedContextIds, setSelectedContextIds] = useState<Set<string>>(new Set());
  const [cachedSuggestions, setCachedSuggestionsState] = useState<SuggestionData | null>(null);
  const [liveSuggestionSourceHash, setLiveSuggestionSourceHash] = useState<string | null>(null);

  const shader = useMemo(() => shaders.find((s) => s.id === shaderId), [shaders, shaderId]);
  const currentSourceHash = useMemo(() => {
    if (!shader?.fragmentSource) return null;
    return hashFragmentSource(shader.fragmentSource);
  }, [shader?.fragmentSource]);

  useEffect(() => {
    if (!shader?.fragmentSource || !currentSourceHash) {
      setCachedSuggestionsState(null);
      setLiveSuggestionSourceHash(null);
      return undefined;
    }

    const cached = getCachedSuggestions(currentSourceHash);
    setCachedSuggestionsState(cached);
    setLiveSuggestionSourceHash(null);

    if (cached) {
      return () => {
        abortSuggestions();
      };
    }

    const timeoutId = window.setTimeout(() => {
      setLiveSuggestionSourceHash(currentSourceHash);
      void fetchSuggestions(shader.fragmentSource);
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      abortSuggestions();
    };
  }, [shader?.fragmentSource, currentSourceHash, fetchSuggestions, abortSuggestions]);

  useEffect(() => {
    if (!currentSourceHash || liveSuggestionSourceHash !== currentSourceHash) return;
    if (!hasAllTierSuggestions(suggestionsData)) return;

    setCachedSuggestions(currentSourceHash, suggestionsData);
    setCachedSuggestionsState({ ...suggestionsData });
  }, [currentSourceHash, liveSuggestionSourceHash, suggestionsData]);

  useEffect(() => {
    if (appliedShader) {
      navigate(`/tile/${appliedShader.id}`, { replace: true });
    }
  }, [appliedShader, navigate]);

  const handleClose = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleApplyDirective = useCallback(
    (directive: string) => {
      if (!shader || !directive.trim()) return;
      const contextShaders = shaders.filter((s) => selectedContextIds.has(s.id));
      void applyDirective(shader, directive, contextShaders);
    },
    [shader, shaders, selectedContextIds, applyDirective]
  );

  const handleContextToggle = useCallback((id: string, checked: boolean) => {
    setSelectedContextIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const activeSuggestions = useMemo(() => {
    if (cachedSuggestions) return cachedSuggestions;
    if (!currentSourceHash || liveSuggestionSourceHash !== currentSourceHash) return {};
    return suggestionsData;
  }, [cachedSuggestions, currentSourceHash, liveSuggestionSourceHash, suggestionsData]);

  const activeLoadingByTier = useMemo(() => {
    if (cachedSuggestions) return IDLE_LOADING_BY_TIER;
    if (!currentSourceHash || liveSuggestionSourceHash !== currentSourceHash) {
      return IDLE_LOADING_BY_TIER;
    }
    return loadingByTier;
  }, [cachedSuggestions, currentSourceHash, liveSuggestionSourceHash, loadingByTier]);

  if (loading) {
    return (
      <div className={styles.editView} role="main" data-testid="edit-view">
        <p>Loading…</p>
      </div>
    );
  }

  if (!shader) {
    return (
      <div className={styles.editView} role="main" data-testid="edit-view">
        <button
          type="button"
          className={styles.close}
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
    <div className={styles.editView} role="main" data-testid="edit-view">
      <button
        type="button"
        className={styles.close}
        aria-label="Close"
        onClick={handleClose}
      >
        ×
      </button>

      <div className={styles.shader} data-testid="edit-view-shader">
        <Tile shader={shader} priority="fullscreen" />
      </div>

      <div style={{ padding: "0 1rem" }}>
        {TIERS.map((tier) => (
          <SuggestionCard
            key={tier}
            tier={tier}
            suggestion={activeSuggestions[tier]}
            isLoading={activeLoadingByTier[tier]}
            isApplying={isApplying}
            onClick={() => {
              const text = activeSuggestions[tier];
              if (text?.trim()) handleApplyDirective(text);
            }}
          />
        ))}
      </div>

      <DirectiveInput
        onSubmit={handleApplyDirective}
        isLoading={isApplying}
      />

      <ContextShaderPicker
        shaders={shaders}
        excludeId={shaderId}
        selectedIds={selectedContextIds}
        onToggle={handleContextToggle}
      />
    </div>
  );
}
