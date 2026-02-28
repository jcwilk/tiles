import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createInMemoryStorage } from "./storage.js";
import { App } from "./App.js";

vi.mock("./useShaderEngine.js", () => ({
  useShaderEngine: vi.fn(() => ({
    engine: { resize: vi.fn() },
    isLoading: false,
    hasContextLoss: false,
    snapshot: null,
    recover: vi.fn(),
  })),
}));

vi.mock("./useVisibility.js", () => ({
  useVisibility: vi.fn(() => ({ isVisible: true })),
}));

vi.stubGlobal("ResizeObserver", vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })));

function renderApp(
  options: { storage?: ReturnType<typeof createInMemoryStorage>; route?: string } = {}
) {
  const { storage = createInMemoryStorage(), route = "/" } = options;
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App storage={storage} />
    </MemoryRouter>
  );
}

describe("main.tsx", () => {
  it("renders TileGrid at root route after loading", async () => {
    const storage = createInMemoryStorage();
    renderApp({ storage, route: "/" });

    await waitFor(() => {
      expect(screen.getByTestId("tile-grid")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add new tile" })).toBeInTheDocument();
  });

  it("renders fullscreen view at /tile/:id", async () => {
    const storage = createInMemoryStorage();
    await storage.add({
      id: "test-shader-1",
      name: "Test",
      vertexSource: "",
      fragmentSource: "void main(){gl_FragColor=vec4(0.);}",
      createdAt: Date.now(),
    });
    renderApp({ storage, route: "/tile/test-shader-1" });

    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-view")).toBeInTheDocument();
    });
  });

  it("renders edit view at /tile/:id/edit", async () => {
    const storage = createInMemoryStorage();
    await storage.add({
      id: "test-shader-2",
      name: "Test",
      vertexSource: "",
      fragmentSource: "void main(){gl_FragColor=vec4(0.);}",
      createdAt: Date.now(),
    });
    renderApp({ storage, route: "/tile/test-shader-2/edit" });

    await waitFor(() => {
      expect(screen.getByTestId("edit-view")).toBeInTheDocument();
    });
    expect(screen.getByTestId("edit-view-shader")).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-conservative")).toBeInTheDocument();
  });

  it("redirects to grid when shader id does not exist", async () => {
    const storage = createInMemoryStorage();
    renderApp({ storage, route: "/tile/nonexistent-id" });

    await waitFor(() => {
      expect(screen.getByTestId("tile-grid")).toBeInTheDocument();
    });
  });

  it("close button in fullscreen navigates back to grid", async () => {
    const storage = createInMemoryStorage();
    await storage.add({
      id: "back-test",
      name: "Back Test",
      vertexSource: "",
      fragmentSource: "void main(){gl_FragColor=vec4(0.);}",
      createdAt: Date.now(),
    });
    // Navigate from grid to fullscreen so back button has somewhere to go
    renderApp({ storage, route: "/" });
    await waitFor(() => {
      expect(screen.getByTestId("tile-grid")).toBeInTheDocument();
    });
    // Simulate clicking a tile to navigate to fullscreen
    fireEvent.click(screen.getByText("Back Test"));
    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-view")).toBeInTheDocument();
    });
    // Close button navigates to grid
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(screen.getByTestId("tile-grid")).toBeInTheDocument();
    });
  });

  it("edit button in fullscreen navigates to edit view", async () => {
    const storage = createInMemoryStorage();
    await storage.add({
      id: "edit-test",
      name: "Edit Test",
      vertexSource: "",
      fragmentSource: "void main(){gl_FragColor=vec4(0.);}",
      createdAt: Date.now(),
    });
    renderApp({ storage, route: "/tile/edit-test" });
    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-view")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => {
      expect(screen.getByTestId("edit-view")).toBeInTheDocument();
    });
    expect(screen.getByTestId("edit-view-shader")).toBeInTheDocument();
  });

  it("delete button removes shader and navigates to grid", async () => {
    const storage = createInMemoryStorage();
    await storage.add({
      id: "delete-test",
      name: "Delete Test",
      vertexSource: "",
      fragmentSource: "void main(){gl_FragColor=vec4(0.);}",
      createdAt: Date.now(),
    });
    renderApp({ storage, route: "/tile/delete-test" });
    await waitFor(() => {
      expect(screen.getByTestId("fullscreen-view")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete tile" }));
    await waitFor(() => {
      expect(screen.getByTestId("tile-grid")).toBeInTheDocument();
    });
    expect(screen.queryByText("Delete Test")).not.toBeInTheDocument();
  });
});
