/**
 * Tests for ShaderContext, ShaderProvider, and hooks.
 * Uses in-memory storage (createInMemoryStorage) to avoid IndexedDB in CI.
 */
import type { ReactNode } from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createInMemoryStorage } from "./storage.js";
import type { ShaderObject } from "./types.js";
import {
  ShaderProvider,
  useShaders,
  useAddShader,
  useDeleteShader,
} from "./shader-context.js";

function createTestShader(overrides: Partial<ShaderObject> = {}): ShaderObject {
  return {
    id: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "Test Shader",
    vertexSource: "v",
    fragmentSource: "f",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("ShaderProvider and useShaders", () => {
  it("provides shaders and loading state", async () => {
    const storage = createInMemoryStorage();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShaderProvider storage={storage}>{children}</ShaderProvider>
    );

    const { result } = renderHook(() => useShaders(), { wrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.shaders).toHaveLength(6);
    expect(result.current.shaders.every((s) => s.id.startsWith("seed-"))).toBe(
      true
    );
  });

  it("updates shaders when addShader is called", async () => {
    const storage = createInMemoryStorage();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShaderProvider storage={storage}>{children}</ShaderProvider>
    );

    const { result } = renderHook(
      () => ({ ...useShaders(), ...useAddShader() }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const beforeCount = result.current.shaders.length;
    const newShader = createTestShader({ id: "user-1", name: "User Shader" });

    await act(async () => {
      await result.current.addShader(newShader);
    });

    expect(result.current.shaders).toHaveLength(beforeCount + 1);
    expect(result.current.shaders.some((s) => s.id === "user-1")).toBe(true);
  });
});

describe("useDeleteShader", () => {
  it("deletes user shader and updates context", async () => {
    const storage = createInMemoryStorage();
    await storage.add(
      createTestShader({ id: "user-delete-me", name: "Delete Me" })
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShaderProvider storage={storage}>{children}</ShaderProvider>
    );

    const { result } = renderHook(
      () => ({ ...useShaders(), ...useDeleteShader() }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const beforeCount = result.current.shaders.length;

    await act(async () => {
      await result.current.deleteShader("user-delete-me");
    });

    expect(result.current.shaders).toHaveLength(beforeCount - 1);
    expect(result.current.shaders.some((s) => s.id === "user-delete-me")).toBe(
      false
    );
  });

  it("rejects deletion of built-in shader", async () => {
    const storage = createInMemoryStorage();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ShaderProvider storage={storage}>{children}</ShaderProvider>
    );

    const { result } = renderHook(
      () => ({ ...useShaders(), ...useDeleteShader() }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const builtIn = result.current.shaders.find((s) => s.id.startsWith("seed-"));
    expect(builtIn).toBeDefined();

    await expect(
      act(async () => {
        await result.current.deleteShader(builtIn!.id);
      })
    ).rejects.toThrow("Built-in shaders cannot be deleted");

    expect(result.current.shaders).toContainEqual(builtIn);
  });
});

describe("hooks outside provider", () => {
  it("useShaders throws when outside ShaderProvider", () => {
    expect(() => renderHook(() => useShaders())).toThrow(
      "useShaders must be used within ShaderProvider"
    );
  });

  it("useAddShader throws when outside ShaderProvider", () => {
    expect(() => renderHook(() => useAddShader())).toThrow(
      "useAddShader must be used within ShaderProvider"
    );
  });

  it("useDeleteShader throws when outside ShaderProvider", () => {
    expect(() => renderHook(() => useDeleteShader())).toThrow(
      "useDeleteShader must be used within ShaderProvider"
    );
  });
});
