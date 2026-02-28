/**
 * Tile React component tests.
 * Uses [VALID CODE] placeholder and mocks to avoid real WebGL in CI.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tile } from "./Tile.jsx";
import type { ShaderObject } from "./types.js";

const MOCK_SHADER: ShaderObject = {
  id: "test-1",
  name: "Placeholder Shader",
  vertexSource: "in vec2 a_position;",
  fragmentSource: "[VALID CODE]",
  createdAt: Date.now(),
};

let mockEngine: { resize: ReturnType<typeof vi.fn> } | null = null;
let mockHasContextLoss = false;
let mockSnapshot: string | null = null;
let mockRecover: ReturnType<typeof vi.fn> = vi.fn();

vi.mock("./useShaderEngine.js", () => ({
  useShaderEngine: vi.fn(() => ({
    engine: mockEngine,
    isLoading: false,
    hasContextLoss: mockHasContextLoss,
    snapshot: mockSnapshot,
    recover: mockRecover,
  })),
}));

vi.mock("./useVisibility.js", () => ({
  useVisibility: vi.fn(() => ({ isVisible: true })),
}));

vi.stubGlobal("ResizeObserver", vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() })));

describe("Tile", () => {
  beforeEach(() => {
    mockEngine = { resize: vi.fn() };
    mockHasContextLoss = false;
    mockSnapshot = null;
    mockRecover = vi.fn();
  });

  it("renders canvas and label", () => {
    render(<Tile shader={MOCK_SHADER} />);

    const canvas = document.querySelector("canvas");
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);

    expect(screen.getByText("Placeholder Shader")).toBeInTheDocument();
  });

  it("applies data-shader-id and className", () => {
    const { container } = render(
      <Tile shader={MOCK_SHADER} className="custom-tile" />
    );

    const tile = container.querySelector(".tile.custom-tile");
    expect(tile).toBeInTheDocument();
    expect(tile).toHaveAttribute("data-shader-id", "test-1");
  });

  it("calls onClick when tile is clicked", () => {
    const onClick = vi.fn();
    const { container } = render(<Tile shader={MOCK_SHADER} onClick={onClick} />);

    const tile = container.querySelector(".tile");
    expect(tile).toBeInTheDocument();
    fireEvent.click(tile!);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("shows delete button when onDelete provided and not isBuiltin", () => {
    const onDelete = vi.fn();
    render(<Tile shader={MOCK_SHADER} onDelete={onDelete} />);

    const deleteBtn = screen.getByRole("button", { name: "Delete tile" });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("omits delete button when isBuiltin", () => {
    render(<Tile shader={MOCK_SHADER} onDelete={vi.fn()} isBuiltin />);

    expect(screen.queryByRole("button", { name: "Delete tile" })).toBeNull();
  });

  it("omits delete button when onDelete not provided", () => {
    render(<Tile shader={MOCK_SHADER} />);

    expect(screen.queryByRole("button", { name: "Delete tile" })).toBeNull();
  });

  it("does not call onClick when delete button is clicked", () => {
    const onClick = vi.fn();
    const onDelete = vi.fn();
    render(
      <Tile shader={MOCK_SHADER} onClick={onClick} onDelete={onDelete} />
    );

    const deleteBtn = screen.getByRole("button", { name: "Delete tile" });
    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows context-loss placeholder when hasContextLoss", () => {
    mockHasContextLoss = true;
    mockSnapshot = "data:image/png;base64,abc";
    render(<Tile shader={MOCK_SHADER} />);

    expect(screen.getByRole("button", { name: "Click to resume" })).toBeInTheDocument();
    expect(document.querySelector(".tile-paused")).toBeInTheDocument();
    expect(document.querySelector(".tile-paused-snapshot")).toHaveAttribute(
      "src",
      "data:image/png;base64,abc"
    );
  });

  it("calls recover when context-loss placeholder is clicked", () => {
    mockHasContextLoss = true;
    render(<Tile shader={MOCK_SHADER} />);

    const resumeBtn = screen.getByRole("button", { name: "Click to resume" });
    fireEvent.click(resumeBtn);

    expect(mockRecover).toHaveBeenCalledOnce();
  });

  it("shows error when engine is null and not loading", () => {
    mockEngine = null;
    render(<Tile shader={MOCK_SHADER} />);

    expect(document.querySelector(".tile-error")).toBeInTheDocument();
    expect(document.querySelector(".tile-error")?.textContent).toContain(
      "Too many active shaders"
    );
  });
});
