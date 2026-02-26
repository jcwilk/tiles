/**
 * Click event helpers for tile interactions.
 * Handles text-node targets (e.g. clicking "×" character) where closest() would fail.
 */
export function getClickedElement(e: MouseEvent): HTMLElement | null {
  const t = e.target as Node;
  return t instanceof Element ? (t as HTMLElement) : (t as Text).parentElement;
}

export function isDeleteOrControlClick(e: MouseEvent): boolean {
  const el = getClickedElement(e);
  return !!el?.closest?.(".tile-delete, .tile-controls");
}
