---
id: til-vkh3
status: open
deps: []
links: []
created: 2026-02-26T00:24:33Z
type: task
priority: 1
assignee: John Wilkinson
---
# Remove voice/transcription interface entirely

Remove all voice/audio/transcription code. The app should only support text input (directives) and suggestion cards.

## Scope

### Files to delete entirely

- `frontend/src/add-from-voice.ts` — MediaRecorder capture, base64 encoding, /transcribe API call
- `frontend/src/speech-recognition.ts` — browser SpeechRecognition wrapper
- `frontend/src/add-from-voice.test.ts` — tests for the above
- `frontend/src/speech-recognition.test.ts` — tests for the above

### Files to edit

- **`frontend/src/edit-view.ts`** (critical): remove imports from `speech-recognition.ts` and `add-from-voice.ts` (lines 8-12), remove mic button creation (~line 119), remove `speechStop` state and all speech recognition event handling (~lines 124-163). The edit view must still work with the text input and suggestion cards. This is the most error-prone part — the mic button handler is interleaved with the directive input UI.
- **`frontend/src/edit-view.test.ts`**: remove or update any test cases that exercise voice/mic functionality
- **`frontend/src/api.ts`**: remove the `transcribeAudio()` function and its import/export
- **`worker/src/index.ts`**: remove the `/transcribe` endpoint (Whisper AI call) and its route handling
- **`worker/src/index.test.ts`**: remove any test cases for the `/transcribe` endpoint

### CSS

- Remove any styles targeting mic buttons or voice recording UI (check `frontend/src/style.css` or wherever styles live)

## Verification

```bash
# Must return zero hits in application code (test fixtures/mocks are OK)
rg -i 'transcri|voice|speech|microphone|getUserMedia|webkitSpeechRecognition|whisper' \
  --glob '!node_modules' --glob '!*.test.ts' frontend/src/ worker/src/
```

- `npm test` — all remaining tests pass
- `npm run lint` — lint passes
- Manual: open edit view → text input and suggestion cards work, no mic button visible

## Acceptance Criteria

1. All voice/transcription code removed from frontend and worker
2. No references to voice/speech/transcription in non-test application code
3. Edit view works correctly with text directives and suggestion cards only
4. All tests pass, lint passes
5. `/transcribe` endpoint no longer exists in worker

