/**
 * AddTileButton — button to trigger adding a new tile.
 * Renders at the end of the grid. Calls onAddTile when clicked.
 */
import { memo, type ReactElement } from "react";

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
    "tile",
    "tile-add-new",
    loading && "tile-add-loading",
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
    >
      <span className="tile-add-icon">+</span>
      <span className="tile-add-label">{loading ? "Processing…" : "Add tile"}</span>
    </button>
  );
}

export const AddTileButton = memo(AddTileButtonInner);
