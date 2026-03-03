import { describe, expect, it, vi } from "vitest";
import {
  inferSpaBasePath,
  restoreSpaRedirectPath,
  SPA_REDIRECT_SESSION_KEY,
} from "./github-pages-spa-fallback.js";

function createContext(redirectedPath: string | null) {
  const sessionStorage = {
    getItem: vi.fn((key: string) => (key === SPA_REDIRECT_SESSION_KEY ? redirectedPath : null)),
    removeItem: vi.fn(),
  };
  const history = {
    replaceState: vi.fn(),
  };
  const location = {
    pathname: "/",
    search: "",
    hash: "",
  };

  return { sessionStorage, history, location };
}

describe("inferSpaBasePath", () => {
  it("uses root base for root deployments", () => {
    expect(inferSpaBasePath("/tile/abc123")).toBe("/");
  });

  it("uses repo base for project deployments", () => {
    expect(inferSpaBasePath("/tiles/tile/abc123")).toBe("/tiles/");
  });

  it("defaults to root when path cannot be inferred", () => {
    expect(inferSpaBasePath("/unknown/path")).toBe("/");
  });
});

describe("restoreSpaRedirectPath", () => {
  it("restores a redirected path including query and hash", () => {
    const redirectedPath = "/tiles/tile/abc123?panel=debug#frag";
    const context = createContext(redirectedPath);
    context.location.pathname = "/tiles/";

    const restored = restoreSpaRedirectPath(context);

    expect(restored).toBe(redirectedPath);
    expect(context.sessionStorage.getItem).toHaveBeenCalledWith(SPA_REDIRECT_SESSION_KEY);
    expect(context.sessionStorage.removeItem).toHaveBeenCalledWith(SPA_REDIRECT_SESSION_KEY);
    expect(context.history.replaceState).toHaveBeenCalledWith(null, "", redirectedPath);
  });

  it("skips replaceState when no redirected path exists", () => {
    const context = createContext(null);

    const restored = restoreSpaRedirectPath(context);

    expect(restored).toBeNull();
    expect(context.sessionStorage.removeItem).not.toHaveBeenCalled();
    expect(context.history.replaceState).not.toHaveBeenCalled();
  });

  it("rejects unsafe redirect values", () => {
    const context = createContext("//evil.example/path");

    const restored = restoreSpaRedirectPath(context);

    expect(restored).toBeNull();
    expect(context.sessionStorage.removeItem).toHaveBeenCalledWith(SPA_REDIRECT_SESSION_KEY);
    expect(context.history.replaceState).not.toHaveBeenCalled();
  });

  it("does not rewrite history when path already matches", () => {
    const redirectedPath = "/tile/abc123";
    const context = createContext(redirectedPath);
    context.location.pathname = "/tile/abc123";

    const restored = restoreSpaRedirectPath(context);

    expect(restored).toBe(redirectedPath);
    expect(context.history.replaceState).not.toHaveBeenCalled();
  });
});
