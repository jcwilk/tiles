/**
 * SuggestionCard component tests.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SuggestionCard } from "./SuggestionCard.jsx";

describe("SuggestionCard", () => {
  it("renders loading state", () => {
    render(
      <SuggestionCard
        tier="conservative"
        isLoading
        onClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("suggestion-conservative")).toHaveTextContent("Loading…");
  });

  it("renders suggestion when loaded", () => {
    render(
      <SuggestionCard
        tier="moderate"
        suggestion="Make it pulse"
        isLoading={false}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByTestId("suggestion-moderate")).toHaveTextContent("Make it pulse");
  });

  it("calls onClick when not loading and clicked", () => {
    const onClick = vi.fn();
    render(
      <SuggestionCard
        tier="wild"
        suggestion="Add rainbow"
        isLoading={false}
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByTestId("suggestion-wild"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when loading", () => {
    const onClick = vi.fn();
    render(
      <SuggestionCard tier="conservative" isLoading onClick={onClick} />
    );
    fireEvent.click(screen.getByTestId("suggestion-conservative"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
