import type { ThemeColors } from "../../types/api";
import { contrastRatio } from "./color";
import { resolveThemeVars, sanitizeTheme, type ThemeVars } from "./resolve";

/**
 * Apply a theme to the document root so the whole customer site updates.
 * Pass nothing or an invalid theme to restore the default palette.
 */
export function applyTheme(theme: ThemeColors | Partial<ThemeColors> | null | undefined): void {
  const vars: ThemeVars = resolveThemeVars(sanitizeTheme(theme));
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}

/** Set granular theme variables on an element (used by scoped previews). */
export function applyThemeToElement(element: HTMLElement, vars: ThemeVars): void {
  for (const [name, value] of Object.entries(vars)) {
    element.style.setProperty(name, value);
  }
}

interface ContrastCheck {
  label: string;
  foreground: string;
  background: string;
  minimum: number;
}

/** Human-readable warnings for combinations likely to fail WCAG contrast. */
export function themeContrastWarnings(theme: ThemeColors): string[] {
  const colors = sanitizeTheme(theme);
  const vars = resolveThemeVars(colors);
  const checks: ContrastCheck[] = [
    { label: "Body text", foreground: colors.foreground, background: colors.background, minimum: 4.5 },
    { label: "Muted text", foreground: colors.muted, background: colors.background, minimum: 4.5 },
    // Buttons render on the primary hover shade, so contrast is measured there.
    { label: "Buttons", foreground: colors.accent, background: vars["--theme-primary-hover"], minimum: 3 },
    { label: "Dark-section text", foreground: colors.accent, background: colors.secondary, minimum: 4.5 },
  ];
  return checks
    .filter((check) => contrastRatio(check.foreground, check.background) < check.minimum)
    .map((check) => `${check.label}: low contrast (below ${check.minimum}:1)`);
}