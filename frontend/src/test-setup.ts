/**
 * Test setup for Vitest/jsdom.
 * Mocks browser APIs not available in jsdom.
 */
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom lacks elementFromPoint; stub returns null (no hit-testing in tests)
if (typeof document.elementFromPoint !== "function") {
  document.elementFromPoint = () => null;
}

// jsdom lacks PointerEvent; polyfill for drag-drop tests
if (typeof globalThis.PointerEvent === "undefined") {
  (globalThis as unknown as { PointerEvent: typeof PointerEvent }).PointerEvent =
    class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(
        type: string,
        init?: PointerEventInit & { pointerId?: number }
      ) {
        super(type, init);
        this.pointerId = init?.pointerId ?? 0;
      }
    } as unknown as typeof PointerEvent;
}

class ResizeObserverMock {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverMock as unknown as typeof ResizeObserver;
}
