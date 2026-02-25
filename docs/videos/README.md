# E2E Test Video Assets

Recorded with Playwright to verify editing behavior fixes (canvas overflow bug).

**How to record:** `CI=1 npx playwright test --config=playwright.record.config.ts -w frontend`

| Video | Description |
|-------|-------------|
| `01-edit-view-opens.webm` | Tap tile → fullscreen → Edit button → edit view with shader preview, suggestion cards, pencil/mic, context grid |
| `02-pencil-toggles-input.webm` | Pencil button toggles custom directive text input (proves canvas no longer blocks clicks) |
| `03-close-returns-to-fullscreen.webm` | Close (×) returns from edit view to fullscreen |
| `04-merge-flow.webm` | Drag tile onto another triggers merge, new tile appears |
