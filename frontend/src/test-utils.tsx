/**
 * React Testing Library test utilities.
 * Provides renderWithProviders (ShaderProvider + ToastProvider + MemoryRouter),
 * createMockShader factory for ShaderObject test doubles, and createWrapperForHook
 * for renderHook. Re-exports userEvent for realistic user interaction tests.
 *
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders
 * for shader compilation tests.
 */
import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createInMemoryStorage } from "./storage.js";
import { ShaderProvider } from "./shader-context.js";
import { ToastProvider } from "./toast-context.js";
import type { ShaderObject } from "./types.js";
import { VALID_CODE } from "./test-harness.js";

export { userEvent } from "@testing-library/user-event";

/** Default vertex source for mock shaders */
const DEFAULT_VERTEX = "in vec2 a_position;";

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial route. Defaults to "/" */
  route?: string;
  /** Initial route entries for MemoryRouter */
  initialEntries?: string[];
  /** Custom storage. Uses createInMemoryStorage() when omitted. */
  storage?: ReturnType<typeof createInMemoryStorage>;
}

/**
 * Renders a component with all providers needed for React component tests:
 * ToastProvider, ShaderProvider (in-memory storage), MemoryRouter.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): ReturnType<typeof render> {
  const {
    route = "/",
    initialEntries = [route],
    storage = createInMemoryStorage(),
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <ToastProvider>
        <ShaderProvider storage={storage}>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </ShaderProvider>
      </ToastProvider>
    );
  }

  return render(ui, {
    ...renderOptions,
    wrapper: Wrapper,
  });
}

export interface CreateMockShaderOverrides {
  id?: string;
  name?: string;
  vertexSource?: string;
  fragmentSource?: string;
  createdAt?: number;
}

/**
 * Creates a mock ShaderObject for tests.
 * Uses [VALID CODE] by default per CONVENTIONS.md.
 *
 * @example
 * createMockShader() // Valid placeholder shader
 * createMockShader({ id: "custom-1", name: "Custom" })
 * createMockShader({ fragmentSource: "[INVALID CODE]" }) // For error path tests
 */
export function createMockShader(
  overrides: CreateMockShaderOverrides = {}
): ShaderObject {
  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: "Mock Shader",
    vertexSource: DEFAULT_VERTEX,
    fragmentSource: VALID_CODE,
    createdAt: Date.now(),
    ...overrides,
  };
}

export interface CreateWrapperForHookOptions {
  /** Custom storage. Uses createInMemoryStorage() when omitted. */
  storage?: ReturnType<typeof createInMemoryStorage>;
  /** When false, omits ShaderProvider (e.g. useFetchSuggestions). Default true. */
  needsShader?: boolean;
}

/**
 * Creates a wrapper for renderHook that includes ToastProvider and optionally ShaderProvider.
 * Use for hooks that require context (useGenerateFromPrompt, useApplyDirective, etc.).
 */
export function createWrapperForHook(
  options: CreateWrapperForHookOptions = {}
): ({ children }: { children: ReactNode }) => ReactElement {
  const {
    storage = createInMemoryStorage(),
    needsShader = true,
  } = options;

  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <ToastProvider>
        {needsShader ? (
          <ShaderProvider storage={storage}>{children}</ShaderProvider>
        ) : (
          children
        )}
      </ToastProvider>
    );
  };
}
