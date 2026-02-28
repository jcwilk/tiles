/**
 * AddTileDialog component tests.
 * Verifies modal rendering, submission, loading state, success navigation, and Enter key.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { AddTileDialog } from "./AddTileDialog.jsx";
import { renderWithProviders } from "./test-utils.js";
import {
  createMockFetchHarness,
  VALID_CODE,
  INVALID_CODE,
} from "./test-harness.js";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AddTileDialog", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockNavigate.mockClear();
  });

  it("renders nothing when isOpen is false", () => {
    renderWithProviders(<AddTileDialog isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal with text input when isOpen", () => {
    renderWithProviders(<AddTileDialog isOpen onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Add new tile" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId("add-tile-prompt-input")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe your shader…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<AddTileDialog isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("submits on button click and shows loading state", async () => {
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    globalThis.fetch = vi.fn(() => fetchPromise);

    const onClose = vi.fn();
    renderWithProviders(<AddTileDialog isOpen onClose={onClose} />);

    const input = screen.getByTestId("add-tile-prompt-input");
    fireEvent.change(input, { target: { value: "blue gradient" } });

    const submitBtn = screen.getByTestId("add-tile-submit");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Processing…")).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();
    });

    resolveFetch!({
      ok: true,
      json: () => Promise.resolve({ fragmentSource: VALID_CODE, tokensUsed: 100 }),
    } as Response);
  });

  it("submits when form is submitted (Enter key triggers form submit)", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });

    renderWithProviders(<AddTileDialog isOpen onClose={vi.fn()} />);

    const input = screen.getByTestId("add-tile-prompt-input");
    fireEvent.change(input, { target: { value: "red plasma" } });
    const form = input.closest("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  it("closes dialog and navigates to new tile on success", async () => {
    globalThis.fetch = createMockFetchHarness({ response: VALID_CODE });

    const onClose = vi.fn();
    renderWithProviders(<AddTileDialog isOpen onClose={onClose} />);

    const input = screen.getByTestId("add-tile-prompt-input");
    fireEvent.change(input, { target: { value: "blue gradient" } });
    fireEvent.click(screen.getByTestId("add-tile-submit"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/tile\/[a-f0-9-]+$/)
    );
  });

  it("disables submit when prompt is empty", () => {
    renderWithProviders(<AddTileDialog isOpen onClose={vi.fn()} />);

    expect(screen.getByTestId("add-tile-submit")).toBeDisabled();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    renderWithProviders(<AddTileDialog isOpen onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows toast on error (via hook)", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });

    renderWithProviders(<AddTileDialog isOpen onClose={vi.fn()} />);

    const input = screen.getByTestId("add-tile-prompt-input");
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByTestId("add-tile-submit"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("3 attempts");
    });
  });
});
