/**
 * useVisibility: React hook wrapping IntersectionObserver.
 * Tracks whether an element is in the viewport. Returns { isVisible: boolean }.
 * Used by Tile (or other components) to drive context pool priority.
 */
import { useEffect, useState } from "react";
import type { RefObject } from "react";

export interface UseVisibilityOptions extends IntersectionObserverInit {}

export interface UseVisibilityResult {
  isVisible: boolean;
}

const DEFAULT_OPTIONS: IntersectionObserverInit = {
  threshold: 0,
  rootMargin: "0px",
};

/**
 * Observes the element referenced by ref and returns whether it is visible in the viewport.
 * Updates on intersection changes and cleans up the observer on unmount.
 */
export function useVisibility(
  ref: RefObject<HTMLElement | null>,
  options?: UseVisibilityOptions
): UseVisibilityResult {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === el) {
          setIsVisible(entry.isIntersecting);
          break;
        }
      }
    }, opts);

    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, [ref, options?.threshold, options?.rootMargin, options?.root]);

  return { isVisible };
}
