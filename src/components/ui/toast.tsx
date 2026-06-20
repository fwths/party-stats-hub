import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback(({ type, title, message, duration = 4000 }: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastHelpers = React.useMemo(
    () => ({
      success: (message: string, title?: string) => addToast({ type: "success", title, message }),
      error: (message: string, title?: string) => addToast({ type: "error", title, message }),
      warning: (message: string, title?: string) => addToast({ type: "warning", title, message }),
      info: (message: string, title?: string) => addToast({ type: "info", title, message }),
    }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast: toastHelpers }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none sm:px-0">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { id, type, title, message, duration } = toast;

  useEffect(() => {
    if (duration === Infinity) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      borderColor: "border-emerald-500/40",
      glowColor: "shadow-emerald-500/10",
      bgGradient: "from-emerald-950/20 to-transparent",
    },
    error: {
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      borderColor: "border-rose-500/40",
      glowColor: "shadow-rose-500/10",
      bgGradient: "from-rose-950/20 to-transparent",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      borderColor: "border-amber-500/40",
      glowColor: "shadow-amber-500/10",
      bgGradient: "from-amber-950/20 to-transparent",
    },
    info: {
      icon: <Info className="w-5 h-5 text-purple-400 shrink-0" />,
      borderColor: "border-purple-500/40",
      glowColor: "shadow-purple-500/10",
      bgGradient: "from-purple-950/20 to-transparent",
    },
  }[type];

  return (
    <div
      className={`card-arcane pointer-events-auto flex gap-3 items-start p-4 rounded-lg border bg-card/95 shadow-lg backdrop-blur-md transition-all duration-300 w-full animate-slide-in-right ${config.borderColor} ${config.glowColor} bg-gradient-to-r ${config.bgGradient}`}
      role="alert"
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-heading font-bold text-sm text-foreground mb-0.5">{title}</h4>}
        <p className="text-xs text-muted-foreground leading-relaxed break-words">{message}</p>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="text-muted-foreground/60 hover:text-foreground transition-colors p-0.5 rounded hover:bg-secondary/40 shrink-0"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
