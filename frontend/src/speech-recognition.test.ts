/**
 * Speech recognition module tests.
 * Mocks SpeechRecognition API for unsupported browsers, errors, and result flow.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
} from "./speech-recognition.js";

describe("speech-recognition", () => {
  const originalSpeechRecognition = (globalThis as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
  const originalWebkit = (globalThis as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

  afterEach(() => {
    vi.unstubAllGlobals();
    (globalThis as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = originalSpeechRecognition;
    (globalThis as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkit;
  });

  describe("isSpeechRecognitionSupported", () => {
    it("returns false when SpeechRecognition is unavailable", () => {
      vi.stubGlobal("SpeechRecognition", undefined);
      vi.stubGlobal("webkitSpeechRecognition", undefined);
      expect(isSpeechRecognitionSupported()).toBe(false);
    });

    it("returns true when SpeechRecognition is available", () => {
      const Mock = vi.fn();
      vi.stubGlobal("SpeechRecognition", Mock);
      expect(isSpeechRecognitionSupported()).toBe(true);
    });

    it("returns true when only webkitSpeechRecognition is available", () => {
      vi.stubGlobal("SpeechRecognition", undefined);
      const Mock = vi.fn();
      (globalThis as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = Mock;
      expect(isSpeechRecognitionSupported()).toBe(true);
    });
  });

  describe("startSpeechRecognition", () => {
    it("returns no-op session when unsupported", () => {
      vi.stubGlobal("SpeechRecognition", undefined);
      vi.stubGlobal("webkitSpeechRecognition", undefined);

      const onInterim = vi.fn();
      const onFinal = vi.fn();
      const session = startSpeechRecognition(onInterim, onFinal);

      expect(session).toHaveProperty("stop");
      expect(typeof session.stop).toBe("function");
      session.stop();
      expect(onInterim).not.toHaveBeenCalled();
      expect(onFinal).not.toHaveBeenCalled();
    });

    it("streams interim results via onInterim and final via onFinal", () => {
      let onresult: ((e: { results: { length: number; isFinal: boolean; [i: number]: { transcript: string } }; resultIndex: number }) => void) | null = null;
      let onnomatch: (() => void) | null = null;
      let onerror: ((e: { error: string }) => void) | null = null;

      const MockRecognition = vi.fn(() => ({
        continuous: false,
        interimResults: false,
        lang: "",
        start: vi.fn(),
        abort: vi.fn(),
        stop: vi.fn(),
        get onresult() {
          return onresult;
        },
        set onresult(fn: typeof onresult) {
          onresult = fn;
        },
        get onnomatch() {
          return onnomatch;
        },
        set onnomatch(fn: typeof onnomatch) {
          onnomatch = fn;
        },
        get onerror() {
          return onerror;
        },
        set onerror(fn: typeof onerror) {
          onerror = fn;
        },
        onend: null,
      }));

      vi.stubGlobal("SpeechRecognition", MockRecognition);

      const onInterim = vi.fn();
      const onFinal = vi.fn();
      const session = startSpeechRecognition(onInterim, onFinal);

      expect(onresult).toBeTruthy();

      // Simulate interim result - event.results[i] is SpeechRecognitionResult (array-like of alternatives)
      const interimResult = { length: 1, 0: { transcript: "hello", confidence: 0.9 }, isFinal: false };
      const resultsList = { 0: interimResult, length: 1 };
      onresult!({ results: resultsList, resultIndex: 0 } as Parameters<NonNullable<typeof onresult>>[0]);

      expect(onInterim).toHaveBeenCalledWith("hello");
      expect(onFinal).not.toHaveBeenCalled();

      // Simulate final result
      const finalResult = { length: 1, 0: { transcript: "hello world", confidence: 0.95 }, isFinal: true };
      const finalResultsList = { 0: finalResult, length: 1 };
      onresult!({ results: finalResultsList, resultIndex: 0 } as Parameters<NonNullable<typeof onresult>>[0]);

      expect(onFinal).toHaveBeenCalledWith("hello world");

      session.stop();
    });

    it("fires onFinal with empty string on nomatch", () => {
      let onnomatch: (() => void) | null = null;
      const MockRecognition = vi.fn(() => ({
        continuous: false,
        interimResults: false,
        lang: "",
        start: vi.fn(),
        abort: vi.fn(),
        stop: vi.fn(),
        onresult: null,
        get onnomatch() {
          return onnomatch;
        },
        set onnomatch(fn: typeof onnomatch) {
          onnomatch = fn;
        },
        onerror: null,
        onend: null,
      }));

      vi.stubGlobal("SpeechRecognition", MockRecognition);

      const onInterim = vi.fn();
      const onFinal = vi.fn();
      startSpeechRecognition(onInterim, onFinal);

      expect(onnomatch).toBeTruthy();
      onnomatch!();
      expect(onFinal).toHaveBeenCalledWith("");
    });

    it("fires onFinal with empty string on error", () => {
      let onerror: ((e: { error: string }) => void) | null = null;
      const MockRecognition = vi.fn(() => ({
        continuous: false,
        interimResults: false,
        lang: "",
        start: vi.fn(),
        abort: vi.fn(),
        stop: vi.fn(),
        onresult: null,
        onnomatch: null,
        get onerror() {
          return onerror;
        },
        set onerror(fn: typeof onerror) {
          onerror = fn;
        },
          onend: null,
      }));

      vi.stubGlobal("SpeechRecognition", MockRecognition);

      const onFinal = vi.fn();
      startSpeechRecognition(() => {}, onFinal);

      expect(onerror).toBeTruthy();
      onerror!({ error: "network" });
      expect(onFinal).toHaveBeenCalledWith("");
    });

    it("stop() calls abort on recognition instance", () => {
      const abort = vi.fn();
      const MockRecognition = vi.fn(() => ({
        continuous: false,
        interimResults: false,
        lang: "",
        start: vi.fn(),
        abort,
        stop: vi.fn(),
        onresult: null,
        onnomatch: null,
        onerror: null,
        onend: null,
      }));

      vi.stubGlobal("SpeechRecognition", MockRecognition);

      const session = startSpeechRecognition(() => {}, () => {});
      session.stop();
      expect(abort).toHaveBeenCalled();
    });
  });
});
