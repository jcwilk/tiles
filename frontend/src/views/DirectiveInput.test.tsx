/**
 * DirectiveInput component tests.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DirectiveInput } from "./DirectiveInput.jsx";

describe("DirectiveInput", () => {
  it("renders pencil button and toggles input visibility", () => {
    render(<DirectiveInput onSubmit={vi.fn()} />);

    const input = screen.getByTestId("directive-input");
    expect(input).toHaveAttribute("data-visible", "false");

    fireEvent.click(screen.getByRole("button", { name: "Custom directive" }));
    expect(input).toHaveAttribute("data-visible", "true");
  });

  it("submits directive on Enter", () => {
    const onSubmit = vi.fn();
    render(<DirectiveInput onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Custom directive" }));
    const input = screen.getByTestId("directive-input");
    fireEvent.change(input, { target: { value: "make it blue" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith("make it blue");
  });

  it("does not submit empty directive", () => {
    const onSubmit = vi.fn();
    render(<DirectiveInput onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Custom directive" }));
    const input = screen.getByTestId("directive-input");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
