import type { ReactNode } from "react";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  centered?: boolean;
  eyebrow?: string;
  tone?: "light" | "dark";
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className = "",
  centered = false,
  eyebrow,
  tone = "light",
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div
      className={`mb-8 ${centered ? "text-center" : ""} ${className}`}
    >
      {eyebrow && (
        <p
          className={`mb-2 text-xs font-semibold uppercase tracking-[0.25em] ${
            dark ? "text-orange-400" : "text-orange-500"
          } sm:text-sm`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`text-2xl font-bold tracking-tight sm:text-3xl ${
          dark ? "text-white" : "text-text-primary"
        }`}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-2 ${dark ? "text-gray-400" : "text-text-secondary"}`}>
          {subtitle}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
