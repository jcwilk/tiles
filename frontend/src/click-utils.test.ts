/**
 * Tests for click-utils: delete/control click detection.
 * Ensures delete button clicks (including text-node targets) are correctly identified.
 */
import { describe, it, expect } from "vitest";
import { isDeleteOrControlClick } from "./click-utils.js";

describe("isDeleteOrControlClick", () => {
  it("returns true when clicking on delete button element", () => {
    const tile = document.createElement("div");
    tile.className = "tile";
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "tile-delete";
    deleteBtn.textContent = "×";
    tile.appendChild(deleteBtn);

    const ev = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(ev, "target", { value: deleteBtn, writable: false });
    expect(isDeleteOrControlClick(ev)).toBe(true);
  });

  it("returns true when clicking on text node inside delete button (bug fix)", () => {
    const tile = document.createElement("div");
    tile.className = "tile";
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "tile-delete";
    deleteBtn.textContent = "×";
    tile.appendChild(deleteBtn);

    const textNode = deleteBtn.firstChild!;
    const ev = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(ev, "target", { value: textNode, writable: false });
    expect(isDeleteOrControlClick(ev)).toBe(true);
  });

  it("returns false when clicking on tile body (canvas/label)", () => {
    const tile = document.createElement("div");
    tile.className = "tile";
    const canvas = document.createElement("canvas");
    const label = document.createElement("span");
    label.className = "tile-label";
    tile.appendChild(canvas);
    tile.appendChild(label);

    const ev = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(ev, "target", { value: canvas, writable: false });
    expect(isDeleteOrControlClick(ev)).toBe(false);

    const ev2 = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(ev2, "target", { value: label, writable: false });
    expect(isDeleteOrControlClick(ev2)).toBe(false);
  });

  it("returns true when clicking on .tile-controls (future-proofing)", () => {
    const controls = document.createElement("div");
    controls.className = "tile-controls";
    const ev = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(ev, "target", { value: controls, writable: false });
    expect(isDeleteOrControlClick(ev)).toBe(true);
  });
});
