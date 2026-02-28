import type { HTMLAttributes } from "react";

export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-emerald-200/70 bg-white/50 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-emerald-900 ${className}`.trim()}
      {...props}
    />
  );
}
