/**
 * Custom directive text input with pencil toggle and submit.
 */
import { useState, useCallback, useRef, useEffect, type ReactElement } from "react";
import styles from "./EditView.module.css";

export interface DirectiveInputProps {
  onSubmit: (directive: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function DirectiveInput({
  onSubmit,
  isLoading = false,
  placeholder = "Describe your modification…",
}: DirectiveInputProps): ReactElement {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    setValue("");
    setVisible(false);
    onSubmit(trimmed);
  }, [value, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const toggleVisible = useCallback(() => {
    setVisible((v) => !v);
  }, []);

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        className={`${styles.directiveInput} ${visible ? styles.visible : ""}`}
        data-visible={visible}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        data-testid="directive-input"
        aria-label="Custom directive"
      />
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionsButton}
          aria-label="Custom directive"
          onClick={toggleVisible}
        >
          ✎
        </button>
      </div>
    </>
  );
}
