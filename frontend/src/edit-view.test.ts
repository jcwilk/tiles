/**
 * Edit view tests.
 * Per CONVENTIONS.md: Use [VALID CODE] / [INVALID CODE] placeholders
 * to validate preview logic without real GPU execution.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  openEditView,
  closeEditView,
  isEditViewOpen,
} from "./edit-view.js";
import { createInMemoryStorage } from "./storage.js";
import { VALID_CODE, INVALID_CODE } from "./test-harness.js";
import type { ShaderObject } from "./types.js";

const MOCK_SHADER: ShaderObject = {
  id: "edit-test-1",
  name: "Test Shader",
  vertexSource: "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: VALID_CODE,
  createdAt: 0,
};

describe("edit-view", () => {
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

  it("opens edit view and renders form with shader data", () => {
    openEditView(MOCK_SHADER, storage);

    expect(isEditViewOpen()).toBe(true);

    const nameInput = document.querySelector<HTMLInputElement>("#edit-name");
    const fragmentTextarea = document.querySelector<HTMLTextAreaElement>("#edit-fragment");

    expect(nameInput).toBeTruthy();
    expect(nameInput?.value).toBe("Test Shader");
    expect(fragmentTextarea).toBeTruthy();
    expect(fragmentTextarea?.value).toBe(VALID_CODE);
  });

  it("shows placeholder validation status for [VALID CODE]", async () => {
    openEditView(MOCK_SHADER, storage);
    await new Promise((r) => setTimeout(r, 350));

    const statusEl = document.querySelector(".edit-preview-status");
    expect(statusEl).toBeTruthy();
    expect(statusEl?.textContent).toContain("placeholder");
    expect(statusEl?.className).toContain("edit-preview-ok");
  });

  it("shows invalid status for [INVALID CODE]", async () => {
    const invalidShader: ShaderObject = {
      ...MOCK_SHADER,
      fragmentSource: INVALID_CODE,
    };
    openEditView(invalidShader, storage);
    await new Promise((r) => setTimeout(r, 350));

    const statusEl = document.querySelector(".edit-preview-status");
    expect(statusEl).toBeTruthy();
    expect(statusEl?.textContent).toContain("Invalid");
    expect(statusEl?.className).toContain("edit-preview-error");
  });

  it("saves updated shader to storage", async () => {
    openEditView(MOCK_SHADER, storage);

    const nameInput = document.querySelector<HTMLInputElement>("#edit-name");
    const fragmentTextarea = document.querySelector<HTMLTextAreaElement>("#edit-fragment");
    const saveBtn = document.querySelector<HTMLButtonElement>(".edit-view-save");

    expect(nameInput).toBeTruthy();
    expect(fragmentTextarea).toBeTruthy();
    expect(saveBtn).toBeTruthy();

    nameInput!.value = "Updated Name";
    fragmentTextarea!.value = VALID_CODE;

    saveBtn!.click();
    await new Promise((r) => setTimeout(r, 0));

    const all = await storage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Updated Name");
    expect(all[0].fragmentSource).toBe(VALID_CODE);
  });

  it("closeEditView removes overlay", () => {
    openEditView(MOCK_SHADER, storage);
    expect(isEditViewOpen()).toBe(true);

    closeEditView();
    expect(isEditViewOpen()).toBe(false);
    expect(document.querySelector(".edit-view")).toBeNull();
  });

  it("cancel button triggers history.back", () => {
    const backSpy = vi.spyOn(history, "back").mockImplementation(() => {});

    openEditView(MOCK_SHADER, storage);
    const cancelBtn = document.querySelector<HTMLButtonElement>(".edit-view-cancel");
    expect(cancelBtn).toBeTruthy();

    cancelBtn!.click();
    expect(backSpy).toHaveBeenCalled();
  });
});
