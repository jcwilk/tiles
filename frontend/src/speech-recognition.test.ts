/**
 * Speech recognition feature detection tests.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
} from "./speech-recognition.js";

describe("isSpeechRecognitionSupported", () => {
  const originalSR = (globalThis as unknown as { window?: Window }).window
    ?.SpeechRecognition;
  const originalWebkit = (globalThis as unknown as { window?: Window }).window
    ?.webkitSpeechRecognition;

  afterEach(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
        originalSR;
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition =
        originalWebkit;
    }
  });

  it("returns false when neither SpeechRecognition nor webkitSpeechRecognition exists", () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    expect(isSpeechRecognitionSupported()).toBe(false);
  });

  it("returns true when SpeechRecognition exists", () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
      class MockSR {};
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it("returns true when webkitSpeechRecognition exists", () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition =
      class MockSR {};
    expect(isSpeechRecognitionSupported()).toBe(true);
  });
});

describe("startSpeechRecognition", () => {
  const originalSR = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  const originalWebkit = (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

  afterEach(() => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = originalSR;
    (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkit;
  });

  it("calls onFinal with empty string when API is not supported", () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    const onInterim = vi.fn();
    const onFinal = vi.fn();
    const { stop } = startSpeechRecognition(onInterim, onFinal);

    expect(onFinal).toHaveBeenCalledWith("");
    expect(onInterim).not.toHaveBeenCalled();
    stop();
  });

  it("returns stop function and sets continuous/interimResults when API supported", () => {
    const abort = vi.fn();
    const startFn = vi.fn();
    const MockRecognition = vi.fn(function (this: Record<string, unknown>) {
      this.continuous = false;
      this.interimResults = false;
      this.onresult = null;
      this.abort = abort;
      this.stop = vi.fn();
      this.start = startFn;
      return this;
    });

    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = MockRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    const onInterim = vi.fn();
    const onFinal = vi.fn();
    const { stop } = startSpeechRecognition(onInterim, onFinal);

    const instance = MockRecognition.mock.results[0]?.value as Record<string, unknown>;
    expect(instance.continuous).toBe(true);
    expect(instance.interimResults).toBe(true);
    expect(startFn).toHaveBeenCalled();

    stop();
    expect(abort).toHaveBeenCalled();
  });
});
