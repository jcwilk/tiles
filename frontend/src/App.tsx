import type { ReactElement } from "react";
import { ToastProvider } from "./toast-context.js";

/**
 * Minimal root component for React migration.
 */
export function App(): ReactElement {
  return (
    <ToastProvider>
      <div id="app-root" data-react-root>
        <div className="tiles-grid">
          <p>Tiles — React root</p>
        </div>
      </div>
    </ToastProvider>
  );
}
