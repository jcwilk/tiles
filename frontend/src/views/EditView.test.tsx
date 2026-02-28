/**
 * EditView component tests.
 * Verifies rendering, suggestion loading, directive submission, context shader picker.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EditView } from "./EditView.jsx";
import type { ShaderObject } from "../types.js";

const MOCK_SHADER: ShaderObject = {
  id: "test-shader",
  name: "Test",
  vertexSource: "in vec2 a_position;",
  fragmentSource: "[VALID CODE]",
  createdAt: 0,
};

const mockNavigate = vi.fn();
const mockFetchSuggestions = vi.fn();
const mockApplyDirective = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../shader-context.js", () => ({
  useShaders: vi.fn(),
}));

vi.mock("../api-hooks.js", () => ({
  useFetchSuggestions: vi.fn(),
  useApplyDirective: vi.fn(),
}));

vi.mock("../Tile.jsx", () => ({
  Tile: ({ shader }: { shader: ShaderObject }) => (
    <div data-testid="tile" data-shader-id={shader.id}>
      {shader.name}
    </div>
  ),
}));

const { useShaders } = await import("../shader-context.js");
const { useFetchSuggestions, useApplyDirective } = await import("../api-hooks.js");

function renderEditView(shaderId: string) {
  return render(
    <MemoryRouter>
      <EditView shaderId={shaderId} />
    </MemoryRouter>
  );
}

describe("EditView", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockFetchSuggestions.mockClear();
    mockApplyDirective.mockClear();

    vi.mocked(useShaders).mockReturnValue({
      shaders: [MOCK_SHADER],
      loading: false,
    });

    vi.mocked(useFetchSuggestions).mockReturnValue({
      execute: mockFetchSuggestions,
      data: {},
      isLoading: false,
      loadingByTier: { conservative: false, moderate: false, wild: false },
      error: undefined,
    });

    vi.mocked(useApplyDirective).mockReturnValue({
      execute: mockApplyDirective,
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it("renders shader preview and suggestion cards", () => {
    renderEditView("test-shader");

    expect(screen.getByTestId("edit-view")).toBeInTheDocument();
    expect(screen.getByTestId("edit-view-shader")).toBeInTheDocument();
    expect(screen.getByTestId("tile")).toHaveAttribute("data-shader-id", "test-shader");
    expect(screen.getByTestId("suggestion-conservative")).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-moderate")).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-wild")).toBeInTheDocument();
  });

  it("suggestion cards show loading state", () => {
    vi.mocked(useFetchSuggestions).mockReturnValue({
      execute: mockFetchSuggestions,
      data: {},
      isLoading: true,
      loadingByTier: { conservative: true, moderate: true, wild: true },
      error: undefined,
    });

    renderEditView("test-shader");

    const cards = [
      screen.getByTestId("suggestion-conservative"),
      screen.getByTestId("suggestion-moderate"),
      screen.getByTestId("suggestion-wild"),
    ];
    cards.forEach((card) => {
      expect(card).toHaveTextContent("Loading…");
    });
  });

  it("suggestion cards populate with AI results", () => {
    vi.mocked(useFetchSuggestions).mockReturnValue({
      execute: mockFetchSuggestions,
      data: {
        conservative: "Add a glow",
        moderate: "Make it pulse",
        wild: "Add rainbow waves",
      },
      isLoading: false,
      loadingByTier: { conservative: false, moderate: false, wild: false },
      error: undefined,
    });

    renderEditView("test-shader");

    expect(screen.getByTestId("suggestion-conservative")).toHaveTextContent("Add a glow");
    expect(screen.getByTestId("suggestion-moderate")).toHaveTextContent("Make it pulse");
    expect(screen.getByTestId("suggestion-wild")).toHaveTextContent("Add rainbow waves");
  });

  it("clicking suggestion applies directive", () => {
    vi.mocked(useFetchSuggestions).mockReturnValue({
      execute: mockFetchSuggestions,
      data: { conservative: "Add a glow" },
      isLoading: false,
      loadingByTier: { conservative: false, moderate: false, wild: false },
      error: undefined,
    });

    renderEditView("test-shader");
    fireEvent.click(screen.getByTestId("suggestion-conservative"));

    expect(mockApplyDirective).toHaveBeenCalledWith(
      MOCK_SHADER,
      "Add a glow",
      []
    );
  });

  it("custom directive input submits on Enter", () => {
    renderEditView("test-shader");

    const pencilBtn = screen.getByRole("button", { name: "Custom directive" });
    fireEvent.click(pencilBtn);

    const input = screen.getByTestId("directive-input");
    fireEvent.change(input, { target: { value: "make it blue" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockApplyDirective).toHaveBeenCalledWith(
      MOCK_SHADER,
      "make it blue",
      []
    );
  });

  it("context shader checkboxes toggle correctly", () => {
    const otherShader: ShaderObject = {
      ...MOCK_SHADER,
      id: "other-shader",
      name: "Other",
    };
    vi.mocked(useShaders).mockReturnValue({
      shaders: [MOCK_SHADER, otherShader],
      loading: false,
    });

    renderEditView("test-shader");

    const checkbox = screen.getByRole("checkbox", { hidden: true });
    expect(checkbox).toBeInTheDocument();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("passes selected context shaders to applyDirective", () => {
    const otherShader: ShaderObject = {
      ...MOCK_SHADER,
      id: "context-shader",
      name: "Context",
    };
    vi.mocked(useShaders).mockReturnValue({
      shaders: [MOCK_SHADER, otherShader],
      loading: false,
    });
    vi.mocked(useFetchSuggestions).mockReturnValue({
      execute: mockFetchSuggestions,
      data: { conservative: "Combine" },
      isLoading: false,
      loadingByTier: { conservative: false, moderate: false, wild: false },
      error: undefined,
    });

    renderEditView("test-shader");

    const checkbox = screen.getByRole("checkbox", { hidden: true });
    fireEvent.click(checkbox);

    fireEvent.click(screen.getByTestId("suggestion-conservative"));

    expect(mockApplyDirective).toHaveBeenCalledWith(
      MOCK_SHADER,
      "Combine",
      [otherShader]
    );
  });

  it("Close button navigates back", () => {
    renderEditView("test-shader");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("navigates to fullscreen of new tile on successful directive", async () => {
    const newShader: ShaderObject = {
      ...MOCK_SHADER,
      id: "new-shader-id",
      name: "Applied",
    };

    vi.mocked(useApplyDirective).mockReturnValue({
      execute: mockApplyDirective,
      data: newShader,
      isLoading: false,
      error: undefined,
    });
    vi.mocked(useFetchSuggestions).mockReturnValue({
      execute: mockFetchSuggestions,
      data: { conservative: "Add glow" },
      isLoading: false,
      loadingByTier: { conservative: false, moderate: false, wild: false },
      error: undefined,
    });

    renderEditView("test-shader");

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/tile/new-shader-id", {
        replace: true,
      });
    });
  });

  it("shows Loading when shaders are loading", () => {
    vi.mocked(useShaders).mockReturnValue({
      shaders: [],
      loading: true,
    });

    renderEditView("test-shader");

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows Tile not found when shader does not exist", () => {
    vi.mocked(useShaders).mockReturnValue({
      shaders: [],
      loading: false,
    });

    renderEditView("nonexistent");

    expect(screen.getByText("Tile not found")).toBeInTheDocument();
  });

  it("calls fetchSuggestions on mount with shader fragment source", () => {
    renderEditView("test-shader");

    expect(mockFetchSuggestions).toHaveBeenCalledWith("[VALID CODE]");
  });
});
