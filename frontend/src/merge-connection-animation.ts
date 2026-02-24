/**
 * Merge connection animation: draws animated lines from source and target tiles
 * to the new merged tile, reinforcing cause-and-effect.
 */

const DURATION_MS = 800;
const LINE_COLOR = "rgba(100, 180, 255, 0.7)";
const LINE_WIDTH = 2;

function getCenter(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

export function playMergeConnectionAnimation(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  mergedEl: HTMLElement
): void {
  const source = getCenter(sourceEl);
  const target = getCenter(targetEl);
  const merged = getCenter(mergedEl);

  const w = window.innerWidth;
  const h = window.innerHeight;

  const overlay = document.createElement("div");
  overlay.className = "merge-connection-overlay";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 999;
  `;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.style.cssText = "position: absolute; inset: 0;";

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute(
    "d",
    `M ${source.x} ${source.y} L ${merged.x} ${merged.y}`
  );
  path1.setAttribute("fill", "none");
  path1.setAttribute("stroke", LINE_COLOR);
  path1.setAttribute("stroke-width", String(LINE_WIDTH));
  path1.setAttribute("stroke-linecap", "round");

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute(
    "d",
    `M ${target.x} ${target.y} L ${merged.x} ${merged.y}`
  );
  path2.setAttribute("fill", "none");
  path2.setAttribute("stroke", LINE_COLOR);
  path2.setAttribute("stroke-width", String(LINE_WIDTH));
  path2.setAttribute("stroke-linecap", "round");

  const len1 = Math.hypot(merged.x - source.x, merged.y - source.y);
  const len2 = Math.hypot(merged.x - target.x, merged.y - target.y);

  path1.style.strokeDasharray = String(len1);
  path1.style.strokeDashoffset = String(len1);
  path2.style.strokeDasharray = String(len2);
  path2.style.strokeDashoffset = String(len2);

  svg.appendChild(path1);
  svg.appendChild(path2);
  overlay.appendChild(svg);
  document.body.appendChild(overlay);

  const start = performance.now();

  function tick(now: number): void {
    const elapsed = now - start;
    const t = Math.min(elapsed / DURATION_MS, 1);
    const easeOut = 1 - (1 - t) * (1 - t);

    path1.style.strokeDashoffset = String(len1 * (1 - easeOut));
    path2.style.strokeDashoffset = String(len2 * (1 - easeOut));

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      overlay.style.transition = "opacity 0.2s ease-out";
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 220);
    }
  }

  requestAnimationFrame(tick);
}
