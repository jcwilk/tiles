import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("main.tsx", () => {
  it("renders TileGrid after loading", async () => {
    const storage = createInMemoryStorage();
    render(<App storage={storage} />);

    await waitFor(() => {
      expect(screen.getByTestId("tile-grid")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Add new tile" })).toBeInTheDocument();
  });
});
