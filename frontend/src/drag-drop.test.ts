/**
 * Drag-drop module tests.
 * Full pointer-event simulation requires a browser env (Playwright).
 */
import { describe, it, expect, vi } from "vitest";
import { setupTileDragDrop } from "./drag-drop.js";

describe("setupTileDragDrop", () => {
  it("returns teardown function", () => {
    const tile1 = document.createElement("div");
    tile1.className = "tile";
    tile1.dataset.shaderId = "a";
    const grid = document.createElement("div");
    grid.appendChild(tile1);

    const teardown = setupTileDragDrop([tile1], {
      onMergeRequest: vi.fn(),
    });
    expect(typeof teardown).toBe("function");
    expect(() => teardown()).not.toThrow();
  });

  it("registers callbacks", () => {
    const tile1 = document.createElement("div");
    tile1.className = "tile";
    tile1.dataset.shaderId = "a";
    const grid = document.createElement("div");
    grid.appendChild(tile1);

    const onMergeRequest = vi.fn();
    setupTileDragDrop([tile1], { onMergeRequest });
    expect(onMergeRequest).not.toHaveBeenCalled();
  });
});
