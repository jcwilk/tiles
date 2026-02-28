/**
 * Context shader selection — checkboxes for other shaders to include as context.
 */
import type { ReactElement } from "react";
import { Tile } from "../Tile.jsx";
import type { ShaderObject } from "../types.js";

export interface ContextShaderPickerProps {
  shaders: ShaderObject[];
  excludeId: string;
  selectedIds: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
}

export function ContextShaderPicker({
  shaders,
  excludeId,
  selectedIds,
  onToggle,
}: ContextShaderPickerProps): ReactElement {
  const contextShaders = shaders.filter((s) => s.id !== excludeId);

  return (
    <div className="edit-context-grid" data-testid="context-shader-picker">
      {contextShaders.map((s) => (
        <label key={s.id} style={{ position: "relative", display: "block" }}>
          <input
            type="checkbox"
            data-shader-id={s.id}
            checked={selectedIds.has(s.id)}
            onChange={(e) => onToggle(s.id, e.target.checked)}
          />
          <Tile shader={s} />
        </label>
      ))}
    </div>
  );
}
