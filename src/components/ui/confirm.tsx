import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "./button";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        options,
        resolve: (value: boolean) => {
          setState(null);
          resolve(value);
        },
      });
    });
  }, []);

  const handleCancel = () => {
    if (state) state.resolve(false);
  };

  const handleConfirm = () => {
    if (state) state.resolve(true);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmDialog options={state.options} onCancel={handleCancel} onConfirm={handleConfirm} />
      )}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const {
    title = "Confirm Action",
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "default",
  } = options;

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onCancel();
    }
  };

  const borderStyles = {
    default: "border-border/60 shadow-accent/5",
    warning: "border-amber-500/40 shadow-amber-500/5",
    destructive: "border-destructive/40 shadow-destructive/5",
  }[variant];

  const icon = {
    default: <AlertCircle className="w-6 h-6 text-accent animate-pulse" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />,
    destructive: <AlertTriangle className="w-6 h-6 text-destructive animate-bounce" />,
  }[variant];

  const confirmButtonVariant = {
    default: "default" as const,
    warning: "default" as const, // We will style it custom or use default
    destructive: "destructive" as const,
  }[variant];

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        className={`card-arcane w-full max-w-md rounded-lg border bg-card p-5 shadow-2xl transition-all duration-300 transform scale-100 ${borderStyles}`}
      >
        <div className="flex gap-3 items-start mb-4">
          <div className="p-2 rounded-full bg-secondary/60 shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg font-bold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-border/30">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="text-xs font-bold px-4 py-2 border border-border/40 hover:bg-secondary/40 rounded-md cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmButtonVariant}
            onClick={onConfirm}
            className={`text-xs font-bold px-4 py-2 rounded-md cursor-pointer ${
              variant === "warning"
                ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-600 shadow shadow-amber-600/25"
                : ""
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
