---
id: til-n4wb
status: closed
deps: [til-q6gh, til-nan6, til-3nik, til-rqoh, til-u3i2]
links: []
created: 2026-02-25T02:13:00Z
type: feature
priority: 2
assignee: John Wilkinson
parent: til-a1kz
---
# Edit view UI

Create frontend/src/edit-view.ts — the fullscreen edit interface. Receives the focused ShaderObject and all other shaders from the tile list. Builds and manages: (1) Large live WebGL shader canvas at top, (2) Three suggestion cards that show shimmer loading then resolve to clickable buttons — one per adventurousness tier, (3) Pencil button that toggles a hidden text input for custom directives (auto-focuses on reveal), (4) Mic button that starts browser SpeechRecognition with interim results streaming into the text input (falls back to Whisper record+transcribe if unsupported), (5) Context shader grid below with small tile thumbnails and checkbox overlays for multi-select, (6) On suggestion click or directive submit: call apply-directive logic, show loading state, on success create new shader, save to storage, add to beginning of tiles, and open its fullscreen view.

## Design

Export openEditView(shader, allShaders, storage, callbacks) and closeEditView(). The edit view is a full-page overlay (similar to fullscreen but scrollable). Uses createTile for the main shader preview. Uses createTile for small context thumbnails. Calls fetchSuggestions from suggest.ts for the 3 cards. Calls performApplyDirective from apply-directive.ts when a directive is applied. Uses startSpeechRecognition from speech-recognition.ts for the mic. Navigation: pushState #id/edit on open. Callbacks include onNewShader so main.ts can update the tile list.

## Acceptance Criteria

Edit view opens as fullscreen scrollable overlay. Main shader renders live. Three suggestion cards load and become clickable. Pencil toggles text input. Mic streams transcription into text input. Context shaders selectable via checkboxes. Applying a directive creates a new shader and opens its fullscreen view. Proper cleanup on close.

