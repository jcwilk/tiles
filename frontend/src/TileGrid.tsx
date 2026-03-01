/**
 * TileGrid — responsive grid of shader tiles.
 * Renders Tile components in a CSS grid (1→2→3→4 columns), newest first.
 * Includes AddTileButton at the end. Tiles use useVisibility for viewport-based priority.
 */
import { useMemo, memo, type ReactElement } from "react";
import type { ShaderObject } from "./types.js";
import { Tile } from "./Tile.jsx";
import { AddTileButton } from "./AddTileButton.jsx";
import { isBuiltInTile } from "./builtin.js";
import styles from "./TileGrid.module.css";

export interface TileGridProps {
  shaders: ShaderObject[];
  onTileClick: (id: string) => void;
  onTileDelete: (id: string) => void;
  onAddTile: () => void;
  addTileLoading?: boolean;
}

const SORT_NEWEST_FIRST = (a: ShaderObject, b: ShaderObject): number =>
  b.createdAt - a.createdAt;

function TileGridInner({
  shaders,
  onTileClick,
  onTileDelete,
  onAddTile,
  addTileLoading = false,
}: TileGridProps): ReactElement {
  const sortedShaders = useMemo(
    () => [...shaders].sort(SORT_NEWEST_FIRST),
    [shaders]
  );

  return (
    <div className={styles.grid} data-testid="tile-grid">
      {sortedShaders.map((shader) => (
        <Tile
          key={shader.id}
          shader={shader}
          onClick={() => onTileClick(shader.id)}
          onDelete={
            isBuiltInTile(shader)
              ? undefined
              : () => onTileDelete(shader.id)
          }
          isBuiltin={isBuiltInTile(shader)}
        />
      ))}
      <AddTileButton onAddTile={onAddTile} loading={addTileLoading} />
    </div>
  );
}

export const TileGrid = memo(TileGridInner);
