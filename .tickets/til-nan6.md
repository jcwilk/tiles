---
id: til-nan6
status: open
deps: []
links: []
created: 2026-02-25T02:12:21Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Streaming voice input module (SpeechRecognition)

Create frontend/src/speech-recognition.ts that wraps the browser SpeechRecognition API for real-time interim transcription. Exports: startSpeechRecognition(onInterim: (text: string) => void, onFinal: (text: string) => void): { stop: () => void } — sets interimResults: true, continuous: true. onInterim fires on each interim result for live text input updates. onFinal fires when recognition ends. Also exports isSpeechRecognitionSupported(): boolean so callers can fall back to Whisper-based recording (existing add-from-voice.ts infra) on unsupported browsers (mainly Firefox).

## Design

Use window.SpeechRecognition || window.webkitSpeechRecognition. Handle onerror gracefully. On onnomatch, fire onFinal with empty string. Clean up stream tracks on stop.

## Acceptance Criteria

isSpeechRecognitionSupported() returns true on Chrome/Edge/Safari. startSpeechRecognition streams interim text via callback. stop() cleanly ends recognition. Falls back gracefully when API unavailable.

