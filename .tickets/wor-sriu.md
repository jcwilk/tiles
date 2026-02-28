---
id: wor-sriu
status: closed
deps: [wor-bstc]
links: []
created: 2026-02-27T02:31:52Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-mqkc
---
# Toast notification React component and context

Create a ToastProvider context and useToast() hook that replaces the current imperative showToast() function. Create a ToastContainer component that renders at the app root and displays toast messages with auto-dismiss. The hook should expose showToast(message, options?) with configurable duration. Toasts should stack, animate in/out, and be dismissible. Standardized interface: ToastMessage { id, message, duration, type? }. The component should be easily testable — useToast() can be called in tests and ToastContainer renders predictable DOM.

## Acceptance Criteria

useToast() hook returns showToast function. ToastContainer renders toast messages. Toasts auto-dismiss after configurable duration. Multiple toasts stack. Unit tests verify toast rendering and dismissal.

