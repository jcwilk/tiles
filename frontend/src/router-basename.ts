/**
 * Normalize Vite base URL for react-router BrowserRouter basename.
 * React Router expects no trailing slash (except root, which should be omitted).
 */
export function getRouterBasename(baseUrl: string): string | undefined {
  const normalized = baseUrl.replace(/\/+$/, "");
  return normalized.length > 0 ? normalized : undefined;
}
