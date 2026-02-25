/**
 * Streaming voice input via browser SpeechRecognition API.
 * Use for real-time interim transcription. Fall back to Whisper (add-from-voice)
 * when isSpeechRecognitionSupported() is false (e.g. Firefox).
 */

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onnomatch: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export function isSpeechRecognitionSupported(): boolean {
  return !!(typeof window !== "undefined" && (window.SpeechRecognition ?? window.webkitSpeechRecognition));
}

export function startSpeechRecognition(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void
): { stop: () => void } {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition) {
    onFinal("");
    return { stop: () => {} };
  }

  const recognition = new Recognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let stopped = false;

  recognition.onresult = (e: SpeechRecognitionEvent) => {
    if (stopped) return;
    const results = e.results;
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < results.length; i++) {
      const result = results[i];
      const alt = result[0];
      const transcript = alt?.transcript ?? "";
      if (result.isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (interim) onInterim(interim);
    if (final) onFinal(final);
  };

  recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
    if (e.error === "no-speech" || e.error === "aborted") {
      if (!stopped) onFinal("");
    } else {
      onFinal("");
    }
  };

  recognition.onnomatch = () => {
    if (!stopped) onFinal("");
  };

  recognition.onend = () => {
    if (!stopped) onFinal("");
  };

  recognition.start();

  const stop = () => {
    stopped = true;
    try {
      recognition.abort();
    } catch {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    }
  };

  return { stop };
}
