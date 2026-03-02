"use client";

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cn(
              "animate-fade-in cursor-pointer rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition",
              {
                "bg-green-600 text-white": t.type === "success",
                "bg-red-600 text-white": t.type === "error",
                "bg-gray-800 text-white": t.type === "info",
              }
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
