/**
 * Tests for context tracker: cap enforcement, eviction, unregister.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  register,
  unregister,
  markVisible,
  markStale,
  makeRoom,
  getActiveCount,
  resetContextTracker,
} from "./context-tracker.js";

const mockEngine = {
  render: vi.fn(),
  resize: vi.fn(),
  setTouch: vi.fn(),
  getLastError: () => null,
  dispose: vi.fn(),
  getLoseContextExtension: () => null,
};

function createCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

describe("context-tracker", () => {
  beforeEach(() => {
    resetContextTracker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetContextTracker();
  });

  it("registers canvas and engine", () => {
    const canvas = createCanvas();
    register(canvas, mockEngine as never);
    expect(getActiveCount()).toBe(1);
  });

  it("unregister removes entry", () => {
    const canvas = createCanvas();
    register(canvas, mockEngine as never);
    unregister(canvas);
    expect(getActiveCount()).toBe(0);
  });

  it("evicts when at cap on makeRoom", () => {
    const canvases: HTMLCanvasElement[] = [];
    const onEvict = vi.fn();

    for (let i = 0; i < 8; i++) {
      const c = createCanvas();
      canvases.push(c);
      register(c, { ...mockEngine, dispose: vi.fn() } as never, onEvict);
    }
    expect(getActiveCount()).toBe(8);

    const c9 = createCanvas();
    makeRoom();
    register(c9, mockEngine as never);

    expect(getActiveCount()).toBe(8);
    expect(onEvict).toHaveBeenCalledTimes(1);
  });

  it("evicts oldest lastVisible first", () => {
    const canvases: HTMLCanvasElement[] = [];
    const evictCalls: number[] = [];

    for (let i = 0; i < 8; i++) {
      const c = createCanvas();
      canvases.push(c);
      const idx = i;
      register(c, { ...mockEngine, dispose: vi.fn() } as never, () =>
        evictCalls.push(idx)
      );
    }

    markVisible(canvases[0]);
    markVisible(canvases[1]);
    markStale([canvases[2], canvases[3], canvases[4]]);

    const c9 = createCanvas();
    makeRoom();
    register(c9, mockEngine as never);

    expect(getActiveCount()).toBe(8);
    expect(evictCalls).toHaveLength(1);
    const evictedIdx = evictCalls[0];
    expect([2, 3, 4, 5, 6, 7]).toContain(evictedIdx);
  });

  it("markStale sets lastVisible to 0 for given canvases", () => {
    const canvases: HTMLCanvasElement[] = [];
    const onEvictCalls: number[] = [];

    for (let i = 0; i < 8; i++) {
      const c = createCanvas();
      canvases.push(c);
      const idx = i;
      register(c, { ...mockEngine, dispose: vi.fn() } as never, () =>
        onEvictCalls.push(idx)
      );
    }

    markStale([canvases[0]]);
    const c9 = createCanvas();
    makeRoom();
    register(c9, mockEngine as never);

    expect(getActiveCount()).toBe(8);
    expect(onEvictCalls).toHaveLength(1);
    expect(onEvictCalls[0]).toBe(0);
  });
});
