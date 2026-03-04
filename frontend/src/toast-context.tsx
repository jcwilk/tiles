/**
 * Toast notification context and components.
 * Replaces imperative toast.ts with React-based ToastProvider and useToast().
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./Toast.module.css";

export interface ToastMessage {
  id: string;
  message: string;
  duration: number;
  type?: "info" | "success" | "error";
}

export interface ShowToastOptions {
  duration?: number;
  type?: ToastMessage["type"];
}

const DEFAULT_DURATION_MS = 4000;

interface ToastContextValue {
  showToast: (message: string, options?: ShowToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `toast-${idCounter}-${Date.now()}`;
}

export interface ToastProviderProps {
  children: ReactNode;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  defaultDuration = DEFAULT_DURATION_MS,
}: ToastProviderProps): ReactNode {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    const t = timeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutsRef.current.delete(id);
    }
    setExitingIds((prev) => new Set(prev).add(id));
  }, []);

  const handleExited = useCallback(
    (id: string) => {
      timeoutsRef.current.delete(id);
      removeToast(id);
    },
    [removeToast]
  );

  const showToast = useCallback(
    (message: string, options?: ShowToastOptions) => {
      const id = generateId();
      const duration = options?.duration ?? defaultDuration;
      const type = options?.type ?? "error";

      const toast: ToastMessage = { id, message, duration, type };

      setToasts((prev) => [...prev, toast]);

      const timeout = setTimeout(() => {
        timeoutsRef.current.delete(id);
        setExitingIds((prev) => new Set(prev).add(id));
      }, duration);
      timeoutsRef.current.set(id, timeout);
    },
    [defaultDuration]
  );

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        exitingIds={exitingIds}
        onDismiss={dismissToast}
        onExited={handleExited}
      />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  exitingIds: Set<string>;
  onDismiss: (id: string) => void;
  onExited: (id: string) => void;
}

function ToastContainer({
  toasts,
  exitingIds,
  onDismiss,
  onExited,
}: ToastContainerProps): ReactNode {
  return (
    <div
      className={styles.container}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          isExiting={exitingIds.has(toast.id)}
          onDismiss={onDismiss}
          onExited={onExited}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  isExiting: boolean;
  onDismiss: (id: string) => void;
  onExited: (id: string) => void;
}

const EXIT_ANIMATION_MS = 200;

function ToastItem({
  toast,
  isExiting,
  onDismiss,
  onExited,
}: ToastItemProps): ReactNode {
  const handleClick = useCallback(() => onDismiss(toast.id), [toast.id, onDismiss]);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent) => {
      if (e.animationName.includes("Exit") || e.animationName.includes("exit")) {
        onExited(toast.id);
      }
    },
    [toast.id, onExited]
  );

  useEffect(() => {
    if (!isExiting) return;
    const id = toast.id;
    const t = setTimeout(() => {
      onExitedRef.current(id);
    }, EXIT_ANIMATION_MS);
    return () => clearTimeout(t);
  }, [isExiting, toast.id]);

  const typeClass =
    toast.type === "info"
      ? styles.info
      : toast.type === "success"
        ? styles.success
        : "";

  return (
    <div
      role="alert"
      className={`${styles.toast} ${typeClass} ${isExiting ? styles.exit : ""}`}
      data-toast-id={toast.id}
      onClick={handleClick}
      onAnimationEnd={handleAnimationEnd}
    >
      {toast.message}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
