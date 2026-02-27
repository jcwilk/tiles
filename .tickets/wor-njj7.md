---
id: wor-njj7
status: open
deps: [wor-bhzq, wor-kl15]
links: []
created: 2026-02-27T02:33:30Z
type: task
priority: 1
assignee: Cursor Agent
parent: wor-mqkc
---
# Edit view React component

Create an EditView React component that replaces the current imperative edit-view.ts. Props: EditViewProps { shaderId: string }. The component should: (1) Show a shader preview using Tile component. (2) Display AI suggestion cards (conservative/moderate/wild) loaded via useFetchSuggestions hook, each with loading state. (3) Provide a custom directive text input with submit button. (4) Show context shader selection — checkboxes for other shaders to include as context. (5) Use useApplyDirective hook for directive submission with loading/error states. (6) Navigate back to fullscreen view on close. (7) After successful directive application, navigate to the fullscreen view of the new/updated tile. Sub-components to extract: SuggestionCard, DirectiveInput, ContextShaderPicker. All sub-components should have clean props interfaces for testability.

## Acceptance Criteria

EditView renders shader preview and suggestions. Suggestion cards show loading states and populate with AI results. Custom directive input submits and shows loading state. Context shader checkboxes toggle correctly. Successful directive creates/updates tile and navigates. Sub-components render with clean interfaces. Unit tests verify rendering, suggestion loading, directive submission.

