/**
 * Fullscreen edit interface for modifying shaders via AI suggestions and directives.
 */
import { createTile, disposeTile, type TileElement } from "./tile.js";
import { fetchSuggestions } from "./suggest.js";
import { performApplyDirective } from "./apply-directive.js";
import {
  startSpeechRecognition,
  isSpeechRecognitionSupported,
} from "./speech-recognition.js";
import { recordAudio } from "./add-from-voice.js";
import { transcribeAudio } from "./api.js";
import type { ShaderObject } from "./types.js";
import type { ShaderStorage } from "./storage.js";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        resolve(base64 ?? "");
      } else {
        reject(new Error("Failed to read blob"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export interface EditViewCallbacks {
  onNewShader: (shader: ShaderObject) => void;
  onMount?: (overlay: HTMLElement) => void;
  onUnmount?: () => void;
}

let currentEditOverlay: HTMLElement | null = null;
let mainTile: TileElement | null = null;
let contextTiles: TileElement[] = [];
let currentCallbacks: EditViewCallbacks | null = null;

export function openEditView(
  shader: ShaderObject,
  allShaders: ShaderObject[],
  storage: ShaderStorage,
  callbacks: EditViewCallbacks
): void {
  if (currentEditOverlay) return;

  const overlay = document.createElement("div");
  overlay.className = "edit-view";

  const closeBtn = document.createElement("button");
  closeBtn.className = "fullscreen-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.style.top = "0.5rem";
  closeBtn.style.right = "0.5rem";
  closeBtn.addEventListener("click", () => history.back());

  const shaderPreview = document.createElement("div");
  shaderPreview.className = "edit-view-shader";

  const mainTileEl = createTile(shader);
  mainTileEl.element.classList.add("tile");
  shaderPreview.appendChild(mainTileEl.element);
  mainTile = mainTileEl;

  overlay.appendChild(closeBtn);
  overlay.appendChild(shaderPreview);

  const suggestionsContainer = document.createElement("div");
  suggestionsContainer.style.padding = "0 1rem";

  const tiers = ["conservative", "moderate", "wild"] as const;
  const suggestionCards: Record<string, HTMLElement> = {};

  tiers.forEach((tier) => {
    const card = document.createElement("div");
    card.className = "edit-suggestion loading";
    card.dataset.tier = tier;
    card.textContent = "Loading…";
    suggestionsContainer.appendChild(card);
    suggestionCards[tier] = card;
  });

  overlay.appendChild(suggestionsContainer);

  fetchSuggestions(shader.fragmentSource, (tier, suggestion) => {
    const card = suggestionCards[tier];
    if (!card) return;
    card.classList.remove("loading");
    card.textContent = suggestion;
    card.dataset.suggestion = suggestion;
  });

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const directiveInput = document.createElement("input");
  directiveInput.type = "text";
  directiveInput.className = "edit-directive-input";
  directiveInput.placeholder = "Describe your modification…";

  const pencilBtn = document.createElement("button");
  pencilBtn.setAttribute("aria-label", "Custom directive");
  pencilBtn.textContent = "✎";
  pencilBtn.style.cssText =
    "width:2.5rem;height:2.5rem;border-radius:50%;border:none;background:rgba(255,255,255,0.2);color:#fff;font-size:1.1rem;cursor:pointer";

  pencilBtn.addEventListener("click", () => {
    const visible = directiveInput.classList.toggle("visible");
    if (visible) directiveInput.focus();
  });

  const micBtn = document.createElement("button");
  micBtn.setAttribute("aria-label", "Voice input");
  micBtn.textContent = "🎤";
  micBtn.style.cssText =
    "width:2.5rem;height:2.5rem;border-radius:50%;border:none;background:rgba(255,255,255,0.2);color:#fff;font-size:1.1rem;cursor:pointer";

  let speechStop: (() => void) | null = null;

  micBtn.addEventListener("click", async () => {
    if (speechStop) {
      speechStop();
      micBtn.classList.remove("edit-mic-active");
      speechStop = null;
      return;
    }

    if (isSpeechRecognitionSupported()) {
      directiveInput.classList.add("visible");
      directiveInput.focus();
      micBtn.classList.add("edit-mic-active");
      speechStop = startSpeechRecognition(
        (interim) => {
          directiveInput.value = interim;
        },
        (final) => {
          if (final) directiveInput.value = final;
          micBtn.classList.remove("edit-mic-active");
          speechStop = null;
        }
      ).stop;
    } else {
      micBtn.classList.add("edit-mic-active");
      const { promise, stop } = recordAudio();
      speechStop = stop;
      try {
        const blob = await promise;
        const base64 = await blobToBase64(blob);
        const { text } = await transcribeAudio(base64);
        directiveInput.classList.add("visible");
        directiveInput.value = text;
        directiveInput.focus();
      } catch {
        /* ignore */
      } finally {
        micBtn.classList.remove("edit-mic-active");
        speechStop = null;
      }
    }
  });

  actions.appendChild(pencilBtn);
  actions.appendChild(micBtn);
  overlay.appendChild(directiveInput);
  overlay.appendChild(actions);

  const contextGrid = document.createElement("div");
  contextGrid.className = "edit-context-grid";

  const contextShaders = allShaders.filter((s) => s.id !== shader.id);
  const selectedIds = new Set<string>();
  contextTiles = [];

  contextShaders.forEach((s) => {
    const wrapper = document.createElement("label");
    wrapper.style.position = "relative";
    wrapper.style.display = "block";

    const tileEl = createTile(s);
    tileEl.element.classList.add("tile");
    contextTiles.push(tileEl);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.shaderId = s.id;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedIds.add(s.id);
      else selectedIds.delete(s.id);
    });

    wrapper.appendChild(checkbox);
    wrapper.appendChild(tileEl.element);
    contextGrid.appendChild(wrapper);
  });

  overlay.appendChild(contextGrid);

  async function applyDirectiveAndUpdate(directive: string): Promise<void> {
    const selected = contextShaders.filter((s) => selectedIds.has(s.id));
    const result = await performApplyDirective(shader, directive, storage, selected);

    if (result.success && result.shader) {
      closeEditView();
      callbacks.onNewShader(result.shader);
    }
  }

  function setupSuggestionClick(card: HTMLElement): void {
    if (card.classList.contains("loading")) return;
    const suggestion = card.dataset.suggestion;
    if (!suggestion) return;
    card.style.pointerEvents = "none";
    card.textContent = "Applying…";
    applyDirectiveAndUpdate(suggestion).finally(() => {
      card.style.pointerEvents = "";
      card.textContent = suggestion;
    });
  }

  tiers.forEach((tier) => {
    suggestionCards[tier].addEventListener("click", () => {
      setupSuggestionClick(suggestionCards[tier]);
    });
  });

  directiveInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const text = directiveInput.value.trim();
      if (text) {
        directiveInput.value = "";
        directiveInput.classList.remove("visible");
        applyDirectiveAndUpdate(text);
      }
    }
  });

  document.body.appendChild(overlay);
  currentEditOverlay = overlay;
  currentCallbacks = callbacks;
  callbacks.onMount?.(overlay);

  history.pushState({ edit: shader.id }, "", `#${shader.id}/edit`);
}

export function closeEditView(): void {
  if (!currentEditOverlay) return;

  if (mainTile) {
    disposeTile(mainTile);
    mainTile = null;
  }
  contextTiles.forEach((t) => disposeTile(t));
  contextTiles = [];

  currentEditOverlay.remove();
  currentEditOverlay = null;
  currentCallbacks?.onUnmount?.();
  currentCallbacks = null;
}
