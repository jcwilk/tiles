import type { ReactElement } from "react";

/**
 * Minimal root component for React migration.
 */
export function App(): ReactElement {
  return (
    <div id="app-root" data-react-root>
      <div className="tiles-grid">
        <p>Tiles — React root</p>
      </div>
    </div>
  );
}
