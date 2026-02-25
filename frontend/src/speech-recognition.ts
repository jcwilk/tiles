/**
 * Wraps the browser SpeechRecognition API for real-time interim transcription.
 * Use isSpeechRecognitionSupported() to detect support; callers can fall back
 * to Whisper-based recording (add-from-voice.ts) on unsupported browsers (e.g. Firefox).
 */
/// <reference types="@types/dom-speech-recognition" />

interface WindowWithSpeech {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Returns true if the browser supports SpeechRecognition (Chrome, Edge, Safari).
 * Returns false on Firefox and other unsupported browsers.
 */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== undefined;
}

export interface SpeechRecognitionSession {
  stop: () => void;
}

/**
 * Starts speech recognition with interim results streaming.
 * Must be called from a user gesture (e.g. click) for mic access.
 *
 * @param onInterim - Fires on each interim result for live text input updates.
 * @param onFinal - Fires when recognition ends (final result or nomatch).
 * @returns { stop } - Call stop() to cleanly end recognition.
 * @throws Does not throw; returns no-op session if unsupported.
 */
export function startSpeechRecognition(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void
): SpeechRecognitionSession {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return { stop: () => {} };
  }

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  const cleanup = () => {
    try {
      if (recognition) {
        recognition.abort();
      }
    } catch {
      // Ignore abort errors
    }
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const result = event.results[event.resultIndex];
    if (!result) return;
    const transcript = Array.from(result)
      .map((r) => (r as SpeechRecognitionAlternative).transcript)
      .join("");
    if (result.isFinal) {
      onFinal(transcript);
    } else {
      onInterim(transcript);
    }
  };

  recognition.onnomatch = () => {
    onFinal("");
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const err = event.error;
    if (err === "no-speech" || err === "aborted") {
      onFinal("");
    } else {
      onFinal("");
    }
  };

  recognition.onend = () => {
    // Recognition ended (stop, abort, or natural end)
  };

  try {
    recognition.start();
  } catch (err) {
    onFinal("");
    return { stop: () => {} };
  }

  return {
    stop: () => {
      cleanup();
    },
  };
}
