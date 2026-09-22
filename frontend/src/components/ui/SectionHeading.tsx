import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  centered?: boolean;
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className = "",
  centered = false,
}: SectionHeadingProps) {
  return (
    <div
      className={`mb-8 ${centered ? "text-center" : ""} ${className}`}
    >
      <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-text-secondary">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
