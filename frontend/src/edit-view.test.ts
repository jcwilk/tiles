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

const NEW_SHADER: ShaderObject = {
  id: "new-shader-id",
  name: "Add a glow",
  vertexSource: "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: "[VALID CODE]",
  createdAt: 123,
};

vi.mock("./apply-directive.js", () => ({
  performApplyDirective: vi.fn(() =>
    Promise.resolve({ success: true, shader: NEW_SHADER })
  ),
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

  it("clicking suggestion applies directive and calls onNewShader on success", async () => {
    const onNewShader = vi.fn();
    openEditView(MOCK_SHADER, [MOCK_SHADER], storage, { onNewShader });

    await new Promise((r) => setTimeout(r, 0));

    const conservativeCard = Array.from(
      document.querySelectorAll(".edit-suggestion")
    ).find((c) => (c as HTMLElement).dataset.tier === "conservative") as HTMLElement;
    expect(conservativeCard).toBeTruthy();
    conservativeCard.click();

    await new Promise((r) => setTimeout(r, 0));

    const { performApplyDirective } = await import("./apply-directive.js");
    expect(performApplyDirective).toHaveBeenCalledWith(
      MOCK_SHADER,
      "Add a glow",
      storage,
      []
    );
    expect(onNewShader).toHaveBeenCalledWith(NEW_SHADER);
    expect(document.querySelector(".edit-view")).toBeFalsy();
  });

  it("passes selected context shaders to performApplyDirective", async () => {
    const otherShader: ShaderObject = {
      ...MOCK_SHADER,
      id: "s2",
      name: "Other",
      fragmentSource: "[VALID CODE]",
    };
    const onNewShader = vi.fn();
    openEditView(MOCK_SHADER, [MOCK_SHADER, otherShader], storage, {
      onNewShader,
    });

    await new Promise((r) => setTimeout(r, 0));

    const checkbox = document.querySelector(
      'input[type="checkbox"][data-shader-id="s2"]'
    ) as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));

    const conservativeCard = Array.from(
      document.querySelectorAll(".edit-suggestion")
    ).find((c) => (c as HTMLElement).dataset.tier === "conservative") as HTMLElement;
    conservativeCard.click();

    await new Promise((r) => setTimeout(r, 0));

    const { performApplyDirective } = await import("./apply-directive.js");
    expect(performApplyDirective).toHaveBeenCalledWith(
      MOCK_SHADER,
      "Add a glow",
      storage,
      [otherShader]
    );
  });

  it("submitting directive via Enter applies and calls onNewShader on success", async () => {
    const onNewShader = vi.fn();
    openEditView(MOCK_SHADER, [MOCK_SHADER], storage, { onNewShader });

    const input = document.querySelector(".edit-directive-input") as HTMLInputElement;
    const pencilBtn = document.querySelector(
      '[aria-label="Custom directive"]'
    ) as HTMLButtonElement;
    pencilBtn?.click();
    input.value = "make it blue";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

    await new Promise((r) => setTimeout(r, 0));

    const { performApplyDirective } = await import("./apply-directive.js");
    expect(performApplyDirective).toHaveBeenCalledWith(
      MOCK_SHADER,
      "make it blue",
      storage,
      []
    );
    expect(onNewShader).toHaveBeenCalledWith(NEW_SHADER);
    expect(document.querySelector(".edit-view")).toBeFalsy();
  });
});
