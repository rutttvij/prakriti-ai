import { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: number; type: "success" | "error"; text: string };

type ToastContextType = {
  push: (type: Toast["type"], text: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      push: (type: Toast["type"], text: string) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, type, text }]);
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 2600);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[130] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-2 text-sm shadow-lg backdrop-blur-xl ${
              t.type === "success"
                ? "border-emerald-300/70 bg-emerald-950/75 text-emerald-100"
                : "border-rose-300/70 bg-rose-950/75 text-rose-100"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
