/**
 * Edit view styles tests.
 * Asserts class presence for edit view CSS. Styles are defined in styles.css;
 * getComputedStyle checks require a real browser (e2e) since jsdom does not apply CSS.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { openEditView, closeEditView, isEditViewOpen } from "./edit-view.js";
import { createInMemoryStorage } from "./storage.js";
import { VALID_CODE } from "./test-harness.js";
import type { ShaderObject } from "./types.js";

const MOCK_SHADER: ShaderObject = {
  id: "style-test-1",
  name: "Style Test",
  vertexSource: "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: VALID_CODE,
  createdAt: 0,
};

describe("edit-view-styles", () => {
  let storage: ReturnType<typeof createInMemoryStorage>;

  beforeEach(() => {
    storage = createInMemoryStorage();
    vi.spyOn(history, "pushState").mockImplementation(() => {});
    vi.spyOn(history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    if (isEditViewOpen()) closeEditView();
    vi.restoreAllMocks();
  });

  it("edit view has required classes when open", () => {
    openEditView(MOCK_SHADER, storage);

    const overlay = document.querySelector(".edit-view");
    expect(overlay).toBeTruthy();
    expect(overlay?.classList.contains("edit-view")).toBe(true);
    expect(document.querySelector(".edit-view-header")).toBeTruthy();
    expect(document.querySelector(".edit-view-title")).toBeTruthy();
    expect(document.querySelector(".edit-view-form")).toBeTruthy();
    expect(document.querySelector(".edit-view-actions")).toBeTruthy();
    expect(document.querySelector(".edit-preview-section")).toBeTruthy();
  });

  it("edit view style classes are usable in DOM", () => {
    const container = document.createElement("div");
    container.className = "edit-view";

    const shader = document.createElement("div");
    shader.className = "edit-view-shader";

    const suggestion = document.createElement("div");
    suggestion.className = "edit-suggestion edit-suggestion-loading";

    const actions = document.createElement("div");
    actions.className = "edit-actions";

    const directiveInput = document.createElement("div");
    directiveInput.className = "edit-directive-input";

    const directiveVisible = document.createElement("div");
    directiveVisible.className = "edit-directive-input edit-directive-input-visible";

    const micBtn = document.createElement("button");
    micBtn.className = "edit-mic-active";

    const grid = document.createElement("div");
    grid.className = "edit-context-grid";

    document.body.appendChild(container);
    container.append(shader, suggestion, actions, directiveInput, directiveVisible, micBtn, grid);

    expect(container.classList.contains("edit-view")).toBe(true);
    expect(shader.classList.contains("edit-view-shader")).toBe(true);
    expect(suggestion.classList.contains("edit-suggestion")).toBe(true);
    expect(suggestion.classList.contains("edit-suggestion-loading")).toBe(true);
    expect(actions.classList.contains("edit-actions")).toBe(true);
    expect(directiveInput.classList.contains("edit-directive-input")).toBe(true);
    expect(directiveVisible.classList.contains("edit-directive-input-visible")).toBe(true);
    expect(micBtn.classList.contains("edit-mic-active")).toBe(true);
    expect(grid.classList.contains("edit-context-grid")).toBe(true);

    container.remove();
  });
});
