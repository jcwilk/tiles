/**
 * Simple toast notification for user feedback.
 * Displays a message briefly at the bottom of the viewport.
 */

const TOAST_DURATION_MS = 4000;

export function showToast(message: string): void {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "alert");
  toast.textContent = message;

  document.body.appendChild(toast);

  const remove = () => {
    toast.classList.add("toast-exit");
    toast.addEventListener(
      "animationend",
      () => toast.remove(),
      { once: true }
    );
  };

  const timeout = setTimeout(remove, TOAST_DURATION_MS);

  toast.addEventListener("click", () => {
    clearTimeout(timeout);
    remove();
  });
}
