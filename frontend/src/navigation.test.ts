/**
 * Navigation tests: history.back() and popstate behavior.
 * Verifies unified X = history.back() navigation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  __testHandlePopState,
  __testSetFullscreenState,
} from "./main.js";
import { createTile } from "./tile.js";
import { openEditView, closeEditView, isEditViewOpen } from "./edit-view.js";
import { createInMemoryStorage } from "./storage.js";
import type { ShaderObject } from "./types.js";
import { VALID_CODE } from "./test-harness.js";

vi.mock("./storage.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./storage.js")>();
  return {
    ...actual,
    createIndexedDBStorage: () => actual.createInMemoryStorage(),
  };
});

const MOCK_SHADER: ShaderObject = {
  id: "nav-test-1",
  name: "Nav Test",
  vertexSource: "#version 300 es\nin vec2 a_position; out vec2 v_uv; void main(){ v_uv=a_position*0.5+0.5; gl_Position=vec4(a_position,0,1); }",
  fragmentSource: VALID_CODE,
  createdAt: 0,
};

describe("navigation", () => {
  let storage: ReturnType<typeof createInMemoryStorage>;

  beforeEach(async () => {
    storage = createInMemoryStorage();
    await storage.add(MOCK_SHADER);
    vi.spyOn(history, "pushState").mockImplementation(() => {});
    // Do not mock replaceState - tests need it to set location.hash
  });

  afterEach(() => {
    if (isEditViewOpen()) closeEditView();
    vi.restoreAllMocks();
  });

  it("handlePopState closes fullscreen when hash is empty", () => {
    const tile = createTile(MOCK_SHADER);
    const overlay = document.createElement("div");
    overlay.className = "fullscreen";
    overlay.appendChild(tile.element);
    document.body.appendChild(overlay);

    __testSetFullscreenState(overlay, tile);
    history.replaceState(null, "", "#");

    __testHandlePopState();

    expect(document.querySelector(".fullscreen")).toBeNull();
  });

  it("handlePopState closes edit view when transitioning from #edit/id to #id", () => {
    openEditView(MOCK_SHADER, storage);
    expect(isEditViewOpen()).toBe(true);

    history.replaceState(null, "", "#nav-test-1");

    __testHandlePopState();

    expect(isEditViewOpen()).toBe(false);
  });

  it("handlePopState does not close edit when hash is #edit/id", () => {
    openEditView(MOCK_SHADER, storage);
    expect(isEditViewOpen()).toBe(true);

    history.replaceState(null, "", "#edit/nav-test-1");

    __testHandlePopState();

    expect(isEditViewOpen()).toBe(true);
    closeEditView();
  });
});
