import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error" | "outline";
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-surface-muted text-text-secondary",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  outline: "border border-border text-text-secondary",
};

export function Badge({ children, className = "", variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
