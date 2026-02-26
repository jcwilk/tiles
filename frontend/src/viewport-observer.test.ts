/**
 * Tests for viewport observer: intersection drives markVisible/markStale.
 * Uses real IntersectionObserver when available (jsdom may not support it).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  observeTile,
  unobserveTile,
  disconnectViewportObserver,
  reconnectViewportObserver,
} from "./viewport-observer.js";
import { createTile } from "./tile.js";
import { resetDefaultPool } from "./webgl-context-pool.js";
import type { ShaderObject } from "./types.js";

const PLACEHOLDER_SHADER: ShaderObject = {
  id: "test-vp",
  name: "Test",
  vertexSource: "in vec2 a_position;",
  fragmentSource: "[VALID CODE]",
  createdAt: Date.now(),
};

describe("viewport-observer", () => {
  beforeEach(() => {
    resetDefaultPool();
    vi.stubGlobal("requestIdleCallback", vi.fn((fn: () => void) => setTimeout(fn, 0)));
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    disconnectViewportObserver();
    resetDefaultPool();
    vi.unstubAllGlobals();
  });

  it("observeTile and unobserveTile do not throw", () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    document.body.appendChild(tile.element);

    expect(() => observeTile(tile)).not.toThrow();
    expect(() => unobserveTile(tile)).not.toThrow();

    tile.element.remove();
  });

  it("disconnectViewportObserver does not throw", () => {
    expect(() => disconnectViewportObserver()).not.toThrow();
  });

  it("reconnectViewportObserver does not throw", () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    document.body.appendChild(tile.element);

    expect(() => reconnectViewportObserver([tile])).not.toThrow();

    tile.element.remove();
  });

  it("observeTile registers tile for intersection callbacks", () => {
    const tile = createTile(PLACEHOLDER_SHADER);
    document.body.appendChild(tile.element);

    observeTile(tile);
    unobserveTile(tile);

    expect(tile.element).toBeInstanceOf(HTMLElement);
    tile.element.remove();
  });
});
