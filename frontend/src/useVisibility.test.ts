/**
 * Tests for useVisibility hook.
 * Mocks IntersectionObserver to verify visibility state changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useVisibility } from "./useVisibility.js";

describe("useVisibility", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let callback: (entries: IntersectionObserverEntry[]) => void;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn((cb: (entries: IntersectionObserverEntry[]) => void) => {
        callback = cb;
        return {
          observe: observeMock,
          unobserve: unobserveMock,
          disconnect: disconnectMock,
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns isVisible false initially when ref is null", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(null);
      return useVisibility(ref);
    });

    expect(result.current.isVisible).toBe(false);
    expect(observeMock).not.toHaveBeenCalled();
  });

  it("observes element and returns isVisible false until intersection callback", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(div);
      return useVisibility(ref);
    });

    expect(result.current.isVisible).toBe(false);
    expect(observeMock).toHaveBeenCalledWith(div);
    expect(IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
      threshold: 0,
      rootMargin: "0px",
    });

    act(() => {
      callback([
        {
          target: div,
          isIntersecting: true,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      callback([
        {
          target: div,
          isIntersecting: false,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isVisible).toBe(false);

    div.remove();
  });

  it("cleans up observer on unmount", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(div);
      return useVisibility(ref);
    });

    unmount();

    expect(unobserveMock).toHaveBeenCalledWith(div);
    div.remove();
  });

  it("accepts optional IntersectionObserver options", () => {
    const div = document.createElement("div");
    document.body.appendChild(div);

    renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(div);
      return useVisibility(ref, {
        threshold: 0.5,
        rootMargin: "10px 20px",
      });
    });

    expect(IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        threshold: 0.5,
        rootMargin: "10px 20px",
      })
    );

    div.remove();
  });

  it("ignores intersection entries for other targets", () => {
    const div = document.createElement("div");
    const other = document.createElement("div");
    document.body.appendChild(div);
    document.body.appendChild(other);

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement | null>(div);
      return useVisibility(ref);
    });

    expect(result.current.isVisible).toBe(false);

    act(() => {
      callback([
        {
          target: other,
          isIntersecting: true,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isVisible).toBe(false);

    act(() => {
      callback([
        {
          target: div,
          isIntersecting: true,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isVisible).toBe(true);

    div.remove();
    other.remove();
  });
});
