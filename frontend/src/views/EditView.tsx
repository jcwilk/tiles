/**
 * Edit view React component.
 * Shows shader preview, AI suggestions, custom directive input, and context shader selection.
 */
import { useEffect, useCallback, useState, useMemo, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useShaders } from "../shader-context.js";
import { useFetchSuggestions, useApplyDirective } from "../api-hooks.js";
import { Tile } from "../Tile.jsx";
import { SuggestionCard, type SuggestionTier } from "./SuggestionCard.jsx";
import { DirectiveInput } from "./DirectiveInput.jsx";
import { ContextShaderPicker } from "./ContextShaderPicker.jsx";
import styles from "./EditView.module.css";

const TIERS: SuggestionTier[] = ["conservative", "moderate", "wild"];

export interface EditViewProps {
  shaderId: string;
}

export function EditView({ shaderId }: EditViewProps): ReactElement {
  const navigate = useNavigate();
  const { shaders, loading } = useShaders();
  const { execute: fetchSuggestions, data: suggestionsData, loadingByTier } = useFetchSuggestions();
  const { execute: applyDirective, data: appliedShader, isLoading: isApplying } = useApplyDirective();

  const [selectedContextIds, setSelectedContextIds] = useState<Set<string>>(new Set());

  const shader = useMemo(() => shaders.find((s) => s.id === shaderId), [shaders, shaderId]);

  useEffect(() => {
    if (shader?.fragmentSource) {
      void fetchSuggestions(shader.fragmentSource);
    }
  }, [shader?.fragmentSource, fetchSuggestions]);

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
            suggestion={suggestionsData[tier]}
            isLoading={loadingByTier[tier]}
            isApplying={isApplying}
            onClick={() => {
              const text = suggestionsData[tier];
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
