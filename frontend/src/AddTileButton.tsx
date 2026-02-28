/**
 * AddTileButton — button to trigger adding a new tile.
 * Renders at the end of the grid. Calls onAddTile when clicked.
 */
import { memo, type ReactElement } from "react";
import styles from "./AddTileButton.module.css";

export interface AddTileButtonProps {
  onAddTile: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

function AddTileButtonInner({
  onAddTile,
  disabled = false,
  loading = false,
  className,
}: AddTileButtonProps): ReactElement {
  const classNames = [
    styles.root,
    loading && styles.loading,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      onClick={onAddTile}
      disabled={disabled}
      aria-label="Add new tile"
      data-testid="add-tile-button"
    >
      <span className={styles.icon}>+</span>
      <span className={styles.label}>{loading ? "Processing…" : "Add tile"}</span>
    </button>
  );
}

export const AddTileButton = memo(AddTileButtonInner);
