import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 shadow-sm",
  secondary:
    "bg-dark-900 text-white hover:bg-dark-800 active:bg-dark-700 shadow-sm",
  outline:
    "border border-border bg-white text-text-primary hover:bg-surface-muted active:bg-surface-dim",
  ghost: "text-text-secondary hover:bg-surface-muted active:bg-surface-dim",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
