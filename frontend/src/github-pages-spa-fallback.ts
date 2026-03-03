const TOP_LEVEL_ROUTE_SEGMENTS = new Set(["tile"]);

export const SPA_REDIRECT_SESSION_KEY = "tiles:spa-redirect-path";

/**
 * Infer SPA base path from a deep-link pathname.
 * - Root deployments: /tile/:id -> /
 * - Project deployments: /<repo>/tile/:id -> /<repo>/
 */
export function inferSpaBasePath(pathname: string): string {
  const segments = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (segments.length === 0) {
    return "/";
  }

  if (TOP_LEVEL_ROUTE_SEGMENTS.has(segments[0])) {
    return "/";
  }

  if (segments.length > 1 && TOP_LEVEL_ROUTE_SEGMENTS.has(segments[1])) {
    return `/${segments[0]}/`;
  }

  return "/";
}

function isSafeAbsolutePath(path: string): boolean {
  return /^\/(?!\/)/.test(path);
}

interface RedirectContext {
  sessionStorage: Pick<Storage, "getItem" | "removeItem">;
  history: Pick<History, "replaceState">;
  location: Pick<Location, "pathname" | "search" | "hash">;
}

/**
 * Restore an SPA deep-link captured by public/404.html before React mounts.
 */
export function restoreSpaRedirectPath(
  context: RedirectContext = {
    sessionStorage: window.sessionStorage,
    history: window.history,
    location: window.location,
  }
): string | null {
  const redirectedPath = context.sessionStorage.getItem(SPA_REDIRECT_SESSION_KEY);
  if (!redirectedPath) {
    return null;
  }

  context.sessionStorage.removeItem(SPA_REDIRECT_SESSION_KEY);
  if (!isSafeAbsolutePath(redirectedPath)) {
    return null;
  }

  const currentPath = `${context.location.pathname}${context.location.search}${context.location.hash}`;
  if (redirectedPath !== currentPath) {
    context.history.replaceState(null, "", redirectedPath);
  }

  return redirectedPath;
}
