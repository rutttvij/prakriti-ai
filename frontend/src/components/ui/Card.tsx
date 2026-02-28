import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`surface-card ${className}`.trim()} {...props} />;
}

export function CardStrong({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`surface-card-strong ${className}`.trim()} {...props} />;
}
