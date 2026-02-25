/**
 * Edit view: fullscreen interface for editing shader metadata and source.
 * Accessible from the maximized shader view. Uses placeholder validation
 * ([VALID CODE] / [INVALID CODE]) for tests to avoid GPU execution.
 */
import type { ShaderObject } from "./types.js";
import type { ShaderStorage } from "./storage.js";
import { createShaderEngine } from "./shader-engine.js";

const VALID_PLACEHOLDER = "[VALID CODE]";
const INVALID_PLACEHOLDER = "[INVALID CODE]";

function isPlaceholderCode(code: string): boolean {
  return code === VALID_PLACEHOLDER || code === INVALID_PLACEHOLDER;
}

function wouldCompile(code: string): boolean {
  if (code === VALID_PLACEHOLDER) return true;
  if (code === INVALID_PLACEHOLDER) return false;
  return false;
}

export interface EditViewCallbacks {
  onSave?: (shader: ShaderObject) => void;
  onClose?: () => void;
}

let editOverlay: HTMLElement | null = null;
let previewEngine: { engine: { dispose: () => void } } | null = null;
let previewAnimationId: number | null = null;
let previewResizeObserver: ResizeObserver | null = null;

function updatePreview(
  fragmentSource: string,
  vertexSource: string,
  previewContainer: HTMLElement,
  canvas: HTMLCanvasElement
): void {
  if (previewAnimationId !== null) {
    cancelAnimationFrame(previewAnimationId);
    previewAnimationId = null;
  }
  previewResizeObserver?.disconnect();
  previewResizeObserver = null;
  previewEngine?.engine?.dispose();
  previewEngine = null;

  const statusEl = previewContainer.querySelector(".edit-preview-status");
  const canvasWrap = previewContainer.querySelector(".edit-preview-canvas-wrap");

  if (isPlaceholderCode(fragmentSource)) {
    if (statusEl) {
      statusEl.textContent = wouldCompile(fragmentSource) ? "Preview (placeholder)" : "Invalid (placeholder)";
      statusEl.className = "edit-preview-status " + (wouldCompile(fragmentSource) ? "edit-preview-ok" : "edit-preview-error");
    }
    if (canvasWrap) (canvasWrap as HTMLElement).style.display = "none";
    return;
  }

  const result = createShaderEngine({
    canvas,
    vertexSource: vertexSource || undefined,
    fragmentSource,
  });

  if (result.success && result.engine) {
    previewEngine = { engine: result.engine };
    if (statusEl) {
      statusEl.textContent = "Preview";
      statusEl.className = "edit-preview-status edit-preview-ok";
    }
    if (canvasWrap) (canvasWrap as HTMLElement).style.display = "block";

    const engine = result.engine;
    previewResizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !previewEngine) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        engine.resize(Math.floor(width), Math.floor(height));
      }
    });
    previewResizeObserver.observe(canvas);

    const loop = () => {
      engine.render();
      previewAnimationId = requestAnimationFrame(loop);
    };
    previewAnimationId = requestAnimationFrame(loop);
  } else {
    if (statusEl) {
      statusEl.textContent = result.compileError ?? result.linkError ?? "Compile error";
      statusEl.className = "edit-preview-status edit-preview-error";
    }
    if (canvasWrap) (canvasWrap as HTMLElement).style.display = "none";
  }
}

export function openEditView(
  shader: ShaderObject,
  storage: ShaderStorage,
  callbacks?: EditViewCallbacks
): void {
  if (editOverlay) return;

  const overlay = document.createElement("div");
  overlay.className = "edit-view fullscreen";

  const header = document.createElement("div");
  header.className = "edit-view-header";

  const closeBtn = document.createElement("button");
  closeBtn.className = "fullscreen-close edit-view-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => {
    history.back();
  });

  const title = document.createElement("h1");
  title.className = "edit-view-title";
  title.textContent = "Edit shader";

  header.appendChild(closeBtn);
  header.appendChild(title);

  const form = document.createElement("div");
  form.className = "edit-view-form";

  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = "edit-name";
  nameLabel.textContent = "Name";
  const nameInput = document.createElement("input");
  nameInput.id = "edit-name";
  nameInput.type = "text";
  nameInput.value = shader.name;
  nameInput.placeholder = "Shader name";

  const fragmentLabel = document.createElement("label");
  fragmentLabel.htmlFor = "edit-fragment";
  fragmentLabel.textContent = "Fragment shader (GLSL)";
  const fragmentTextarea = document.createElement("textarea");
  fragmentTextarea.id = "edit-fragment";
  fragmentTextarea.value = shader.fragmentSource;
  fragmentTextarea.rows = 12;
  fragmentTextarea.spellcheck = false;

  const vertexLabel = document.createElement("label");
  vertexLabel.htmlFor = "edit-vertex";
  vertexLabel.textContent = "Vertex shader (optional)";
  const vertexTextarea = document.createElement("textarea");
  vertexTextarea.id = "edit-vertex";
  vertexTextarea.value = shader.vertexSource;
  vertexTextarea.rows = 6;
  vertexTextarea.spellcheck = false;

  const previewSection = document.createElement("div");
  previewSection.className = "edit-preview-section";
  const previewStatus = document.createElement("div");
  previewStatus.className = "edit-preview-status";
  previewStatus.textContent = "Preview";
  const previewCanvasWrap = document.createElement("div");
  previewCanvasWrap.className = "edit-preview-canvas-wrap";
  const previewCanvas = document.createElement("canvas");
  previewCanvas.className = "edit-preview-canvas";
  previewCanvasWrap.appendChild(previewCanvas);
  previewSection.appendChild(previewStatus);
  previewSection.appendChild(previewCanvasWrap);

  const debounceMs = 300;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const schedulePreview = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      updatePreview(
        fragmentTextarea.value,
        vertexTextarea.value,
        previewSection,
        previewCanvas
      );
    }, debounceMs);
  };

  fragmentTextarea.addEventListener("input", schedulePreview);
  vertexTextarea.addEventListener("input", schedulePreview);
  schedulePreview();

  const actions = document.createElement("div");
  actions.className = "edit-view-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "edit-view-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => history.back());

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "edit-view-save";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim() || "Unnamed";
    const fragmentSource = fragmentTextarea.value;
    const vertexSource = vertexTextarea.value;

    const updated: ShaderObject = {
      ...shader,
      name,
      fragmentSource,
      vertexSource,
    };
    await storage.add(updated);
    callbacks?.onSave?.(updated);
    closeEditView();
    history.replaceState({ fullscreen: updated.id }, "", `#${updated.id}`);
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);

  form.appendChild(nameLabel);
  form.appendChild(nameInput);
  form.appendChild(fragmentLabel);
  form.appendChild(fragmentTextarea);
  form.appendChild(vertexLabel);
  form.appendChild(vertexTextarea);
  form.appendChild(previewSection);
  form.appendChild(actions);

  overlay.appendChild(header);
  overlay.appendChild(form);

  document.body.appendChild(overlay);
  editOverlay = overlay;

  history.pushState({ edit: shader.id }, "", `#edit/${shader.id}`);
}

export function closeEditView(): void {
  if (!editOverlay) return;

  if (previewAnimationId !== null) {
    cancelAnimationFrame(previewAnimationId);
    previewAnimationId = null;
  }
  previewEngine?.engine?.dispose();
  previewEngine = null;

  editOverlay.remove();
  editOverlay = null;
}

export function isEditViewOpen(): boolean {
  return editOverlay !== null;
}
