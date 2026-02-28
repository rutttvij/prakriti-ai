import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const classes: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost:
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-white/15",
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return <button className={`${classes[variant]} ${className}`.trim()} {...props} />;
}
