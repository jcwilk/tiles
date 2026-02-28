/**
 * FullscreenView component tests.
 * Verifies rendering, navigation (close/edit), delete, and redirect for non-existent shader.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FullscreenView } from "./FullscreenView.jsx";
import type { ShaderObject } from "../types.js";
import { createMockShader } from "../test-utils.js";

const createShader = (id: string, name: string): ShaderObject =>
  createMockShader({ id, name });

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../shader-context.js", () => ({
  useShaders: vi.fn(),
  useDeleteShader: vi.fn(),
}));

vi.mock("../builtin.js", () => ({
  isBuiltInTile: vi.fn((s: ShaderObject) => s.id.startsWith("seed-")),
}));

vi.mock("../Tile.jsx", () => ({
  Tile: ({
    shader,
    onDelete,
    isBuiltin,
  }: {
    shader: ShaderObject;
    onDelete?: () => void;
    isBuiltin?: boolean;
  }) => (
    <div data-testid="fullscreen-tile" data-shader-id={shader.id}>
      {shader.name}
      {!isBuiltin && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete tile"
        >
          Delete
        </button>
      )}
    </div>
  ),
}));

vi.stubGlobal("ResizeObserver", vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })));

const { useShaders, useDeleteShader } = await import("../shader-context.js");
const { isBuiltInTile } = await import("../builtin.js");

function renderFullscreen(shaderId: string) {
  return render(
    <MemoryRouter>
      <FullscreenView shaderId={shaderId} />
    </MemoryRouter>
  );
}

describe("FullscreenView", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    vi.mocked(useShaders).mockReturnValue({
      shaders: [
        createShader("custom-1", "Custom Shader"),
        createShader("seed-0-123", "Gradient"),
      ],
      loading: false,
    });
    vi.mocked(useDeleteShader).mockReturnValue({
      deleteShader: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(isBuiltInTile).mockImplementation((s) => s.id.startsWith("seed-"));
  });

  it("renders full-viewport tile when shader exists", () => {
    renderFullscreen("custom-1");

    expect(screen.getByTestId("fullscreen-view")).toBeInTheDocument();
    expect(screen.getByTestId("fullscreen-tile")).toHaveAttribute(
      "data-shader-id",
      "custom-1"
    );
    expect(screen.getByText("Custom Shader")).toBeInTheDocument();
  });

  it("shows Close and Edit buttons", () => {
    renderFullscreen("custom-1");

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("Close navigates to grid", () => {
    renderFullscreen("custom-1");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("Edit navigates to edit view", () => {
    renderFullscreen("custom-1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(mockNavigate).toHaveBeenCalledWith("/tile/custom-1/edit");
  });

  it("shows Loading while useShaders is loading", () => {
    vi.mocked(useShaders).mockReturnValue({
      shaders: [],
      loading: true,
    });
    renderFullscreen("custom-1");

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("redirects to grid when shaderId does not exist", async () => {
    renderFullscreen("nonexistent-id");

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("shows Delete tile button for non-builtin shader", () => {
    renderFullscreen("custom-1");

    expect(screen.getByRole("button", { name: "Delete tile" })).toBeInTheDocument();
  });

  it("does not show Delete tile button for builtin shader", () => {
    renderFullscreen("seed-0-123");

    expect(screen.queryByRole("button", { name: "Delete tile" })).not.toBeInTheDocument();
  });

  it("Delete removes shader and navigates to grid", async () => {
    const deleteShader = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useDeleteShader).mockReturnValue({ deleteShader });

    renderFullscreen("custom-1");
    fireEvent.click(screen.getByRole("button", { name: "Delete tile" }));

    await waitFor(() => {
      expect(deleteShader).toHaveBeenCalledWith("custom-1");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });
});
