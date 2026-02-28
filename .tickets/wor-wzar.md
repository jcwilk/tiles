---
id: wor-wzar
status: closed
deps: [wor-9s1n, wor-kl15]
links: []
created: 2026-02-27T02:33:43Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-mqkc
---
# Add tile flow component

Create an AddTileDialog React component for the add-tile-from-prompt flow. The component should: (1) Render as a modal/dialog triggered by the AddTileButton in the grid. (2) Provide a text input for the shader prompt. (3) Use useGenerateFromPrompt hook for submission with loading state. (4) Show toast on error. (5) On success, close dialog and navigate to the new tile's fullscreen view. (6) Support keyboard submission (Enter). Props: AddTileDialogProps { isOpen: boolean, onClose: () => void }. Keep it simple and focused — this replaces the current inline prompt handling in main.ts.

## Acceptance Criteria

AddTileDialog renders modal with text input. Submit calls API via hook. Loading state shown during generation. Success closes dialog and shows new tile fullscreen. Error shows toast. Keyboard submit works. Unit tests verify dialog rendering, submission, and state transitions.

