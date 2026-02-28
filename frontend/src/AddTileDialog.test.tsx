/**
 * AddTileDialog component tests.
 * Verifies modal rendering, submission, loading state, success navigation, and Enter key.
 */
import type { ReactNode } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AddTileDialog } from "./AddTileDialog.jsx";
import { createInMemoryStorage } from "./storage.js";
import { ShaderProvider } from "./shader-context.js";
import { ToastProvider } from "./toast-context.js";
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

function createWrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const storage = createInMemoryStorage();
  return ({ children }: { children: ReactNode }) => (
    <ToastProvider>
      <ShaderProvider storage={storage}>
        <MemoryRouter>{children}</MemoryRouter>
      </ShaderProvider>
    </ToastProvider>
  );
}

describe("AddTileDialog", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockNavigate.mockClear();
  });

  it("renders nothing when isOpen is false", () => {
    render(
      <AddTileDialog isOpen={false} onClose={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal with text input when isOpen", () => {
    render(
      <AddTileDialog isOpen onClose={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const dialog = screen.getByRole("dialog", { name: "Add new tile" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByTestId("add-tile-prompt-input")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe your shader…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(
      <AddTileDialog isOpen onClose={onClose} />,
      { wrapper: createWrapper() }
    );

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
    render(
      <AddTileDialog isOpen onClose={onClose} />,
      { wrapper: createWrapper() }
    );

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

    render(
      <AddTileDialog isOpen onClose={vi.fn()} />,
      { wrapper: createWrapper() }
    );

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
    render(
      <AddTileDialog isOpen onClose={onClose} />,
      { wrapper: createWrapper() }
    );

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
    render(
      <AddTileDialog isOpen onClose={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId("add-tile-submit")).toBeDisabled();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <AddTileDialog isOpen onClose={onClose} />,
      { wrapper: createWrapper() }
    );

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows toast on error (via hook)", async () => {
    globalThis.fetch = createMockFetchHarness({ response: INVALID_CODE });

    render(
      <AddTileDialog isOpen onClose={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByTestId("add-tile-prompt-input");
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByTestId("add-tile-submit"));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent("3 attempts");
    });
  });
});
