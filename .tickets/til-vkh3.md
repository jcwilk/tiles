---
id: til-vkh3
status: open
deps: []
links: []
created: 2026-02-26T00:24:33Z
type: task
priority: 1
assignee: John Wilkinson
parent: til-n5ip
---
# Remove voice/transcription interface entirely

Pull ALL transcription and voice interface code out of the repo. The app should only support text-based interaction: combining tiles (drag-and-drop merge), entering directives (text input), and selecting directives (suggestion cards). There should be zero voice/audio/transcription functionality remaining.

## Scope

### Frontend files to remove or clean:
- `frontend/src/add-from-voice.ts` — entire file (MediaRecorder audio capture, base64 encoding, /transcribe API call)
- `frontend/src/speech-recognition.ts` — entire file (browser SpeechRecognition / webkitSpeechRecognition wrapper)
- `frontend/src/edit-view.ts` — remove mic button, voice input toggle, all speech recognition integration (lines ~126-165 and related imports/event handlers)
- Any CSS related to mic buttons or voice recording UI

### Worker endpoints to remove:
- `worker/src/index.ts` — remove the `/transcribe` endpoint (Whisper AI call) and its route handling
- `frontend/src/api.ts` — remove the `transcribeAudio()` function (POST /transcribe client)

### Tests to update:
- Remove or update any tests referencing voice, transcription, audio, mic, SpeechRecognition, or the /transcribe endpoint

### Verification:
- grep the entire repo for: transcri, voice, speech, microphone, audio, MediaRecorder, getUserMedia, webkitSpeechRecognition, whisper, mic — ensure zero hits in application code
- All remaining tests pass
- Lint passes
- Edit view still works with text input and suggestion cards

## Acceptance Criteria

1. All voice/transcription code removed from frontend and worker
2. No references to transcription, voice, speech, microphone, audio recording in app code
3. Edit view works correctly with text directives and suggestion cards only
4. All tests pass, lint passes
5. /transcribe endpoint no longer exists in worker

