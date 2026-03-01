/**
 * Tests for ToastProvider, ToastContainer, and useToast.
 */
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  ToastProvider,
  useToast,
} from "./toast-context.js";

function TestConsumer(): ReactElement {
  const { showToast } = useToast();
  return (
    <div>
      <button
        type="button"
        onClick={() => showToast("Hello toast")}
        data-testid="show-toast"
      >
        Show
      </button>
      <button
        type="button"
        onClick={() => showToast("Custom duration", { duration: 100 })}
        data-testid="show-short-toast"
      >
        Show short
      </button>
      <button
        type="button"
        onClick={() => showToast("Success msg", { type: "success" })}
        data-testid="show-success"
      >
        Show success
      </button>
    </div>
  );
}

describe("ToastProvider and useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children without toasts", () => {
    render(
      <ToastProvider>
        <span data-testid="child">Child content</span>
      </ToastProvider>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows toast when showToast is called", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId("show-toast"));

    expect(screen.getByText("Hello toast")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Hello toast");
  });

  it("stacks multiple toasts", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId("show-toast"));
    fireEvent.click(screen.getByTestId("show-toast"));

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts.every((el) => el.textContent === "Hello toast")).toBe(true);
  });

  it("auto-dismisses toast after duration", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId("show-short-toast"));
    expect(screen.getByText("Custom duration")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByText("Custom duration")).not.toBeInTheDocument();
  });

  it("dismisses toast on click", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId("show-toast"));
    const toast = screen.getByText("Hello toast");
    expect(toast).toBeInTheDocument();

    fireEvent.click(toast);

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByText("Hello toast")).not.toBeInTheDocument();
  });

  it("throws when useToast is used outside ToastProvider", () => {
    const ConsoleSpy = (): null => {
      useToast();
      return null;
    };
    expect(() => render(<ConsoleSpy />)).toThrow(
      "useToast must be used within ToastProvider"
    );
  });

  it("renders toast with type class for styling", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId("show-success"));
    const toast = screen.getByText("Success msg");
    expect(toast).toBeInTheDocument();
    expect(toast.closest("[role=alert]")).toBeInTheDocument();
  });

  it("renders predictable DOM with data-toast-id", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId("show-toast"));
    const toast = screen.getByRole("alert");
    expect(toast).toHaveAttribute("data-toast-id");
    expect(toast.getAttribute("data-toast-id")).toMatch(/^toast-\d+-\d+$/);
  });
});
