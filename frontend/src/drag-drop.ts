/**
 * Pointer-based drag-and-drop for tiles.
 * Works with both mouse and touch (Pointer Events).
 */
const DRAG_THRESHOLD_PX = 10;

export interface DragDropCallbacks {
  onMergeRequest(sourceId: string, targetId: string): void;
  onDropTargetChange?(targetId: string | null): void;
}

export function setupTileDragDrop(
  tileElements: HTMLElement[],
  callbacks: DragDropCallbacks
): () => void {
  let sourceId: string | null = null;
  let sourceTile: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let suppressNextClick = false;
  let currentTargetId: string | null = null;

  function getTileId(el: HTMLElement): string | null {
    return el.closest(".tile")?.getAttribute("data-shader-id") ?? null;
  }

  function findTileAt(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y);
    return el?.closest(".tile") ?? null;
  }

  function setDropTarget(target: HTMLElement | null): void {
    tileElements.forEach((el) => {
      const id = el.getAttribute("data-shader-id");
      if (id === sourceId) return;
      el.classList.toggle("tile-drop-target", el === target);
    });
    const newTargetId = target ? getTileId(target) : null;
    if (newTargetId !== currentTargetId) {
      currentTargetId = newTargetId;
      callbacks.onDropTargetChange?.(newTargetId);
    }
  }

  function handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.buttons !== 0) return;
    const tile = (e.target as HTMLElement).closest(".tile");
    if (!tile || tile.closest(".fullscreen")) return;
    const id = getTileId(tile as HTMLElement);
    if (!id) return;

    sourceId = id;
    sourceTile = tile as HTMLElement;
    startX = e.clientX;
    startY = e.clientY;
    isDragging = false;
    sourceTile.setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (sourceId === null) return;

    if (!isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        isDragging = true;
      }
    }

    if (isDragging) {
      const target = findTileAt(e.clientX, e.clientY);
      if (target && getTileId(target) !== sourceId) {
        setDropTarget(target);
      } else {
        setDropTarget(null);
      }
    }
  }

  function handlePointerUp(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (sourceId === null) return;

    if (isDragging) {
      const target = findTileAt(e.clientX, e.clientY);
      const targetId = target ? getTileId(target) : null;
      if (targetId && targetId !== sourceId) {
        callbacks.onMergeRequest(sourceId, targetId);
      }
      setDropTarget(null);
      suppressNextClick = true;
    }

    sourceTile?.releasePointerCapture?.(e.pointerId);
    sourceId = null;
    sourceTile = null;
    isDragging = false;
    currentTargetId = null;
  }

  function handleClick(e: MouseEvent): void {
    if (suppressNextClick) {
      e.preventDefault();
      e.stopPropagation();
      suppressNextClick = false;
      return;
    }
  }

  const grid = tileElements[0]?.parentElement;
  if (!grid) return () => {};

  grid.addEventListener("pointerdown", handlePointerDown, { capture: true });
  grid.addEventListener("pointermove", handlePointerMove, { capture: true });
  grid.addEventListener("pointerup", handlePointerUp, { capture: true });
  grid.addEventListener("pointercancel", handlePointerUp, { capture: true });
  grid.addEventListener("click", handleClick, { capture: true });

  return () => {
    grid.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    grid.removeEventListener("pointermove", handlePointerMove, { capture: true });
    grid.removeEventListener("pointerup", handlePointerUp, { capture: true });
    grid.removeEventListener("pointercancel", handlePointerUp, { capture: true });
    grid.removeEventListener("click", handleClick, { capture: true });
  };
}
