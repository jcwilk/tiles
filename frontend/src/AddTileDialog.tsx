/**
 * AddTileDialog — modal for adding a new tile from a shader prompt.
 * Uses useGenerateFromPrompt for submission. On success, closes and navigates
 * to the new tile's fullscreen view. Enter key submits.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { useNavigate } from "react-router-dom";
import { useGenerateFromPrompt } from "./api-hooks.js";
import styles from "./AddTileDialog.module.css";

export interface AddTileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTileDialog({
  isOpen,
  onClose,
}: AddTileDialogProps): ReactElement | null {
  const navigate = useNavigate();
  const { execute, data, isLoading } = useGenerateFromPrompt();
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const handledDataIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt("");
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (data && isOpen && data.id !== handledDataIdRef.current) {
      handledDataIdRef.current = data.id;
      onClose();
      navigate(`/tile/${data.id}`);
    }
  }, [data, isOpen, onClose, navigate]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = prompt.trim();
      if (!trimmed || isLoading) return;
      void execute(trimmed);
    },
    [prompt, isLoading, execute]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [isLoading, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-tile-dialog-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.dialog}>
        <h2 id="add-tile-dialog-title">Add new tile</h2>
        <p className={styles.hint}>
          Describe your shader (e.g. blue gradient, red plasma)
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your shader…"
            disabled={isLoading}
            aria-label="Shader prompt"
            data-testid="add-tile-prompt-input"
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submit}
              disabled={!prompt.trim() || isLoading}
              data-testid="add-tile-submit"
            >
              {isLoading ? "Processing…" : "Generate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
