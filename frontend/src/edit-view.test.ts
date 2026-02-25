/**
 * Edit view rendering and interaction tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openEditView, closeEditView } from "./edit-view.js";
import { createInMemoryStorage } from "./storage.js";
import type { ShaderObject } from "./types.js";

const MOCK_SHADER: ShaderObject = {
  id: "s1",
  name: "Test",
  vertexSource: "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: "[VALID CODE]",
  createdAt: 0,
};

vi.mock("./suggest.js", () => ({
  fetchSuggestions: vi.fn((_fragment: string, onSuggestion: (tier: string, text: string) => void) => {
    onSuggestion("conservative", "Add a glow");
    onSuggestion("moderate", "Make it pulse");
    onSuggestion("wild", "Add rainbow waves");
    return Promise.resolve();
  }),
}));

vi.mock("./speech-recognition.js", () => ({
  isSpeechRecognitionSupported: vi.fn(() => false),
  startSpeechRecognition: vi.fn(() => ({ stop: vi.fn() })),
}));

describe("edit-view", () => {
  let storage: ReturnType<typeof createInMemoryStorage>;

  beforeEach(() => {
    storage = createInMemoryStorage();
    document.body.innerHTML = '<div id="app"></div>';
  });

  afterEach(() => {
    closeEditView();
  });

  it("renders key DOM elements when opened", () => {
    openEditView(MOCK_SHADER, [MOCK_SHADER], storage, {
      onNewShader: vi.fn(),
    });

    const overlay = document.querySelector(".edit-view");
    expect(overlay).toBeTruthy();
    expect(overlay?.querySelector(".edit-view-shader")).toBeTruthy();
    expect(overlay?.querySelectorAll(".edit-suggestion")).toHaveLength(3);
    expect(overlay?.querySelector(".edit-actions")).toBeTruthy();
    expect(overlay?.querySelector(".edit-directive-input")).toBeTruthy();
    expect(overlay?.querySelector(".edit-context-grid")).toBeTruthy();
  });

  it("suggestion cards become clickable after fetchSuggestions resolves", async () => {
    openEditView(MOCK_SHADER, [MOCK_SHADER], storage, {
      onNewShader: vi.fn(),
    });

    await new Promise((r) => setTimeout(r, 0));

    const cards = document.querySelectorAll(".edit-suggestion");
    expect(cards.length).toBeGreaterThanOrEqual(3);
    const conservativeCard = Array.from(cards).find(
      (c) => (c as HTMLElement).dataset.tier === "conservative"
    );
    expect(conservativeCard).toBeTruthy();
    expect((conservativeCard as HTMLElement).classList.contains("loading")).toBe(false);
    expect((conservativeCard as HTMLElement).textContent).toContain("Add a glow");
  });

  it("pencil button toggles directive input visibility", () => {
    openEditView(MOCK_SHADER, [MOCK_SHADER], storage, {
      onNewShader: vi.fn(),
    });

    const input = document.querySelector(".edit-directive-input") as HTMLInputElement;
    const pencilBtn = document.querySelector(
      '[aria-label="Custom directive"]'
    ) as HTMLButtonElement;

    expect(input?.classList.contains("visible")).toBe(false);
    pencilBtn?.click();
    expect(input?.classList.contains("visible")).toBe(true);
    pencilBtn?.click();
    expect(input?.classList.contains("visible")).toBe(false);
  });

  it("closeEditView removes overlay", () => {
    openEditView(MOCK_SHADER, [MOCK_SHADER], storage, {
      onNewShader: vi.fn(),
    });
    expect(document.querySelector(".edit-view")).toBeTruthy();

    closeEditView();
    expect(document.querySelector(".edit-view")).toBeFalsy();
  });
});
