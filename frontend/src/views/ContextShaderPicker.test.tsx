/**
 * ContextShaderPicker component tests.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContextShaderPicker } from "./ContextShaderPicker.jsx";
import type { ShaderObject } from "../types.js";

vi.mock("../Tile.jsx", () => ({
  Tile: ({ shader }: { shader: ShaderObject }) => (
    <div data-testid={`tile-${shader.id}`}>{shader.name}</div>
  ),
}));

const MOCK_SHADER: ShaderObject = {
  id: "s1",
  name: "Shader 1",
  vertexSource: "",
  fragmentSource: "",
  createdAt: 0,
};

const OTHER_SHADER: ShaderObject = {
  ...MOCK_SHADER,
  id: "s2",
  name: "Shader 2",
};

describe("ContextShaderPicker", () => {
  it("renders context shaders excluding current", () => {
    const onToggle = vi.fn();
    render(
      <ContextShaderPicker
        shaders={[MOCK_SHADER, OTHER_SHADER]}
        excludeId="s1"
        selectedIds={new Set()}
        onToggle={onToggle}
      />
    );

    expect(screen.getByTestId("context-shader-picker")).toBeInTheDocument();
    expect(screen.getByTestId("tile-s2")).toBeInTheDocument();
    expect(screen.queryByTestId("tile-s1")).not.toBeInTheDocument();
  });

  it("calls onToggle when checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(
      <ContextShaderPicker
        shaders={[MOCK_SHADER, OTHER_SHADER]}
        excludeId="s1"
        selectedIds={new Set()}
        onToggle={onToggle}
      />
    );

    const checkbox = screen.getByRole("checkbox", { hidden: true });
    fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith("s2", true);
  });
});
