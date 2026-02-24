/**
 * Merge connection animation tests.
 * Validates overlay creation, SVG structure, and cleanup.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { playMergeConnectionAnimation } from "./merge-connection-animation.js";

describe("playMergeConnectionAnimation", () => {
  let sourceEl: HTMLElement;
  let targetEl: HTMLElement;
  let mergedEl: HTMLElement;

  beforeEach(() => {
    sourceEl = document.createElement("div");
    targetEl = document.createElement("div");
    mergedEl = document.createElement("div");

    Object.defineProperty(sourceEl, "getBoundingClientRect", {
      value: () => ({ left: 10, top: 10, width: 100, height: 100 }),
    });
    Object.defineProperty(targetEl, "getBoundingClientRect", {
      value: () => ({ left: 150, top: 10, width: 100, height: 100 }),
    });
    Object.defineProperty(mergedEl, "getBoundingClientRect", {
      value: () => ({ left: 80, top: 150, width: 100, height: 100 }),
    });
  });

  afterEach(() => {
    document
      .body
      .querySelectorAll(".merge-connection-overlay")
      .forEach((el) => el.remove());
  });

  it("adds overlay with SVG to document.body", () => {
    playMergeConnectionAnimation(sourceEl, targetEl, mergedEl);

    const overlay = document.body.querySelector(".merge-connection-overlay");
    expect(overlay).toBeTruthy();
    expect(overlay?.querySelector("svg")).toBeTruthy();
    expect(overlay?.querySelectorAll("path")).toHaveLength(2);
  });

  it("draws paths from source and target centers to merged center", () => {
    playMergeConnectionAnimation(sourceEl, targetEl, mergedEl);

    const overlay = document.body.querySelector(".merge-connection-overlay");
    const paths = overlay?.querySelectorAll("path") ?? [];
    expect(paths).toHaveLength(2);

    const sourceCenter = { x: 60, y: 60 };
    const targetCenter = { x: 200, y: 60 };
    const mergedCenter = { x: 130, y: 200 };

    expect(paths[0].getAttribute("d")).toContain(`${sourceCenter.x}`);
    expect(paths[0].getAttribute("d")).toContain(`${sourceCenter.y}`);
    expect(paths[0].getAttribute("d")).toContain(`${mergedCenter.x}`);
    expect(paths[0].getAttribute("d")).toContain(`${mergedCenter.y}`);

    expect(paths[1].getAttribute("d")).toContain(`${targetCenter.x}`);
    expect(paths[1].getAttribute("d")).toContain(`${targetCenter.y}`);
    expect(paths[1].getAttribute("d")).toContain(`${mergedCenter.x}`);
    expect(paths[1].getAttribute("d")).toContain(`${mergedCenter.y}`);
  });

});
