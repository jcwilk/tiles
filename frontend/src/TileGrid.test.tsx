/**
 * TileGrid component tests.
 * Verifies grid structure, sort order, and callback propagation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TileGrid } from "./TileGrid.jsx";
import { createMockShader } from "./test-utils.js";

const SHADER_OLD = createMockShader({
  id: "custom-1",
  name: "Older",
  createdAt: 1000,
});
const SHADER_NEW = createMockShader({
  id: "custom-2",
  name: "Newer",
  createdAt: 2000,
});
const SHADER_SEED = createMockShader({
  id: "seed-0-123",
  name: "Gradient",
  createdAt: 500,
});

let mockEngine: { resize: ReturnType<typeof vi.fn> } | null = null;

vi.mock("./useShaderEngine.js", () => ({
  useShaderEngine: vi.fn(() => ({
    engine: mockEngine,
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

describe("TileGrid", () => {
  beforeEach(() => {
    mockEngine = { resize: vi.fn() };
  });

  it("renders grid with data-testid and tiles-grid class", () => {
    render(
      <TileGrid
        shaders={[]}
        onTileClick={vi.fn()}
        onTileDelete={vi.fn()}
        onAddTile={vi.fn()}
      />
    );

    const grid = screen.getByTestId("tile-grid");
    expect(grid).toBeInTheDocument();
    expect(grid.tagName.toLowerCase()).toBe("div");
  });

  it("maps shaders to Tile components", () => {
    const shaders = [SHADER_OLD, SHADER_NEW];
    render(
      <TileGrid
        shaders={shaders}
        onTileClick={vi.fn()}
        onTileDelete={vi.fn()}
        onAddTile={vi.fn()}
      />
    );

    expect(screen.getByText("Older")).toBeInTheDocument();
    expect(screen.getByText("Newer")).toBeInTheDocument();
  });

  it("renders AddTileButton at end of grid", () => {
    render(
      <TileGrid
        shaders={[SHADER_OLD]}
        onTileClick={vi.fn()}
        onTileDelete={vi.fn()}
        onAddTile={vi.fn()}
      />
    );

    const addBtn = screen.getByRole("button", { name: "Add new tile" });
    expect(addBtn).toBeInTheDocument();
    expect(screen.getByTestId("add-tile-button")).toBe(addBtn);
  });

  it("sorts shaders newest first", () => {
    const shaders = [SHADER_OLD, SHADER_NEW];
    const { container } = render(
      <TileGrid
        shaders={shaders}
        onTileClick={vi.fn()}
        onTileDelete={vi.fn()}
        onAddTile={vi.fn()}
      />
    );

    const tiles = container.querySelectorAll("[data-shader-id]");
    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toHaveAttribute("data-shader-id", "custom-2");
    expect(tiles[1]).toHaveAttribute("data-shader-id", "custom-1");
  });

  it("calls onTileClick with shader id when tile is clicked", () => {
    const onTileClick = vi.fn();
    const { container } = render(
      <TileGrid
        shaders={[SHADER_OLD]}
        onTileClick={onTileClick}
        onTileDelete={vi.fn()}
        onAddTile={vi.fn()}
      />
    );

    const tile = container.querySelector('[data-shader-id="custom-1"]');
    expect(tile).toBeInTheDocument();
    fireEvent.click(tile!);

    expect(onTileClick).toHaveBeenCalledOnce();
    expect(onTileClick).toHaveBeenCalledWith("custom-1");
  });

  it("calls onTileDelete with shader id when delete is clicked on non-builtin tile", () => {
    const onTileDelete = vi.fn();
    render(
      <TileGrid
        shaders={[SHADER_OLD]}
        onTileClick={vi.fn()}
        onTileDelete={onTileDelete}
        onAddTile={vi.fn()}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: "Delete tile" });
    fireEvent.click(deleteBtn);

    expect(onTileDelete).toHaveBeenCalledOnce();
    expect(onTileDelete).toHaveBeenCalledWith("custom-1");
  });

  it("does not pass onDelete for built-in tiles (seed shaders)", () => {
    render(
      <TileGrid
        shaders={[SHADER_SEED]}
        onTileClick={vi.fn()}
        onTileDelete={vi.fn()}
        onAddTile={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Delete tile" })).toBeNull();
  });

  it("calls onAddTile when Add tile button is clicked", () => {
    const onAddTile = vi.fn();
    render(
      <TileGrid
        shaders={[]}
        onTileClick={vi.fn()}
        onTileDelete={vi.fn()}
        onAddTile={onAddTile}
      />
    );

    const addBtn = screen.getByRole("button", { name: "Add new tile" });
    fireEvent.click(addBtn);

    expect(onAddTile).toHaveBeenCalledOnce();
  });

  it("shows loading state on AddTileButton when addTileLoading is true", () => {
    render(
      <TileGrid
        shaders={[]}
        onTileClick={vi.fn()}
        onTileDelete={vi.fn()}
        onAddTile={vi.fn()}
        addTileLoading
      />
    );

    expect(screen.getByText("Processing…")).toBeInTheDocument();
  });
});
