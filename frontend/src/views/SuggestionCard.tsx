/**
 * Suggestion card for AI suggestions (conservative/moderate/wild).
 * Shows loading state or suggestion text. Clickable when not loading.
 */
import type { ReactElement } from "react";
import styles from "./EditView.module.css";

export type SuggestionTier = "conservative" | "moderate" | "wild";

export interface SuggestionCardProps {
  tier: SuggestionTier;
  suggestion?: string;
  isLoading: boolean;
  isApplying?: boolean;
  onClick: () => void;
}

export function SuggestionCard({
  tier,
  suggestion,
  isLoading,
  isApplying = false,
  onClick,
}: SuggestionCardProps): ReactElement {
  const disabled = isLoading || isApplying || !suggestion?.trim();
  const displayText = isLoading
    ? "Loading…"
    : isApplying
      ? "Applying…"
      : suggestion ?? "—";

  return (
    <div
      className={`${styles.suggestion} ${isLoading ? styles.loading : ""}`}
      data-tier={tier}
      data-suggestion={suggestion}
      data-testid={`suggestion-${tier}`}
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
      }
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? undefined : 0}
      style={disabled ? { pointerEvents: "none" } : undefined}
    >
      {displayText}
    </div>
  );
}
