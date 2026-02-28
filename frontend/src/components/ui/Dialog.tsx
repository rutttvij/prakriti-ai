import type { ReactNode } from "react";

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="surface-card-strong w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-slate-600 hover:bg-white/70">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
