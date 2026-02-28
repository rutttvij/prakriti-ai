import type { HTMLAttributes } from "react";

export function Separator({ className = "", ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={`border-0 h-px bg-emerald-200/25 ${className}`.trim()} {...props} />;
}
