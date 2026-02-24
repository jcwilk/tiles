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

  it("creates and removes drag preview during drag sequence", () => {
    const tile1 = document.createElement("div");
    tile1.className = "tile";
    tile1.dataset.shaderId = "a";
    const grid = document.createElement("div");
    grid.appendChild(tile1);
    document.body.appendChild(grid);

    const teardown = setupTileDragDrop([tile1], { onMergeRequest: vi.fn() });

    const rect = tile1.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    tile1.dispatchEvent(
      new PointerEvent("pointerdown", {
        clientX: startX,
        clientY: startY,
        button: 0,
        pointerId: 1,
        bubbles: true,
      })
    );

    tile1.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: startX + 20,
        clientY: startY + 20,
        button: 0,
        pointerId: 1,
        bubbles: true,
      })
    );

    const preview = document.body.querySelector(".tile-drag-preview");
    expect(preview).toBeTruthy();

    tile1.dispatchEvent(
      new PointerEvent("pointerup", {
        clientX: startX + 20,
        clientY: startY + 20,
        button: 0,
        pointerId: 1,
        bubbles: true,
      })
    );

    expect(document.body.querySelector(".tile-drag-preview")).toBeNull();

    teardown();
    document.body.removeChild(grid);
  });
});
