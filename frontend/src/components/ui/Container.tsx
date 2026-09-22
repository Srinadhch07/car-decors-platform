import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "article";
}

export function Container({ children, className = "", as: Tag = "div" }: ContainerProps) {
  return <Tag className={`container-page ${className}`}>{children}</Tag>;
}
