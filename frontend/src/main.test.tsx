import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("main.tsx", () => {
  it("renders minimal React root", () => {
    render(<App />);
    expect(screen.getByText("Tiles — React root")).toBeInTheDocument();
  });
});
