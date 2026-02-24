/**
 * Add new tile from voice: record audio, transcribe via Cloudflare Whisper,
 * generate shader from prompt, compile and save.
 */
import { transcribeAudio, generateFromPrompt } from "./api.js";
import { createShaderEngine } from "./shader-engine.js";
import { showToast } from "./toast.js";
import type { ShaderObject } from "./types.js";
import type { ShaderStorage } from "./storage.js";

const MAX_ATTEMPTS = 3;
const DEFAULT_VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

function stripMarkdownFences(raw: string): string {
  let s = raw.trim();
  const m = s.match(/^```(?:glsl)?\s*\n?([\s\S]*?)\n?```\s*$/m);
  if (m) return m[1].trim();
  return s.replace(/^```(?:glsl)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
}

function createTempCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas;
}

export interface AddFromVoiceResult {
  success: boolean;
  shader?: ShaderObject;
}

/**
 * Record audio from the microphone. Returns a promise that resolves when
 * stop() is called or maxDurationMs is reached.
 */
export function recordAudio(maxDurationMs = 15_000): {
  stop: () => void;
  promise: Promise<Blob>;
} {
  let resolvePromise!: (blob: Blob) => void;
  let rejectPromise!: (err: Error) => void;
  const promise = new Promise<Blob>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  let mediaRecorder: MediaRecorder | null = null;
  const chunks: Blob[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.length > 0) {
          resolvePromise(new Blob(chunks, { type: mimeType }));
        } else {
          rejectPromise(new Error("No audio data recorded"));
        }
      };

      mediaRecorder.onerror = () => {
        rejectPromise(new Error("Recording failed"));
      };

      mediaRecorder.start(100);
      timeoutId = setTimeout(stop, maxDurationMs);
    })
    .catch((err) => {
      rejectPromise(err instanceof Error ? err : new Error(String(err)));
    });

  return { stop, promise };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1];
        resolve(base64 ?? "");
      } else {
        reject(new Error("Failed to read blob"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Process a recorded audio blob: transcribe, generate shader, save.
 * Used by performAddFromVoice and by tests with a pre-recorded blob.
 */
export async function processAudioBlob(
  blob: Blob,
  storage: ShaderStorage
): Promise<AddFromVoiceResult> {
  try {
    const audioBase64 = await blobToBase64(blob);
    if (!audioBase64) {
      showToast("No audio recorded. Please try again.");
      return { success: false };
    }

    const { text } = await transcribeAudio(audioBase64);
    if (!text.trim()) {
      showToast("No speech detected. Please try again.");
      return { success: false };
    }

    let previousError: string | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const { fragmentSource: raw } = await generateFromPrompt(text, previousError);
        const fragmentSource = stripMarkdownFences(raw);

        const canvas = createTempCanvas();
        const result = createShaderEngine({
          canvas,
          vertexSource: DEFAULT_VERTEX,
          fragmentSource,
        });

        if (result.success) {
          const shader: ShaderObject = {
            id: crypto.randomUUID(),
            name: text.slice(0, 50) + (text.length > 50 ? "…" : ""),
            vertexSource: DEFAULT_VERTEX,
            fragmentSource,
            createdAt: Date.now(),
          };
          await storage.add(shader);
          return { success: true, shader };
        }

        previousError = result.compileError ?? result.linkError ?? "Unknown compilation error";
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        showToast(`Generation failed: ${message}`);
        return { success: false };
      }
    }

    showToast("Shader failed to compile after 3 attempts. Please try again.");
    return { success: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    showToast(`Generation failed: ${message}`);
    return { success: false };
  }
}

export async function performAddFromVoice(storage: ShaderStorage): Promise<AddFromVoiceResult> {
  try {
    const { promise } = recordAudio();
    const blob = await promise;
    return processAudioBlob(blob, storage);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Permission")) {
      showToast("Microphone access denied. Please allow microphone to add tiles by voice.");
    } else {
      showToast(err instanceof Error ? err.message : "Recording failed");
    }
    return { success: false };
  }
}
