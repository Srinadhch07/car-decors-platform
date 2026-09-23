import type { ThemeColors } from "../../types/api";
import { mix, normalizeHex } from "./color";
import { DEFAULT_THEME, THEME_COLOR_KEYS, type ThemeColorKey } from "./presets";

/** CSS custom properties the website theme controls. */
export const THEME_VAR_NAMES = [
  "--theme-primary",
  "--theme-primary-hover",
  "--theme-primary-active",
  "--theme-primary-deep",
  "--theme-primary-light",
  "--theme-primary-soft",
  "--theme-secondary",
  "--theme-secondary-soft",
  "--theme-secondary-dim",
  "--theme-secondary-border",
  "--theme-secondary-deep",
  "--theme-surface",
  "--theme-surface-muted",
  "--theme-surface-dim",
  "--theme-foreground",
  "--theme-foreground-secondary",
  "--theme-foreground-muted",
  "--theme-foreground-inverse",
  "--theme-border",
  "--theme-border-light",
] as const;

export type ThemeVars = Record<(typeof THEME_VAR_NAMES)[number], string>;

const AUTO_ORANGE_VARS: ThemeVars = {
  "--theme-primary": "#F97316",
  "--theme-primary-hover": "#EA580C",
  "--theme-primary-active": "#C2410C",
  "--theme-primary-deep": "#9A3412",
  "--theme-primary-light": "#FB923C",
  "--theme-primary-soft": "#FFF7ED",
  "--theme-secondary": "#111111",
  "--theme-secondary-soft": "#1A1A1A",
  "--theme-secondary-dim": "#262626",
  "--theme-secondary-border": "#333333",
  "--theme-secondary-deep": "#0A0A0A",
  "--theme-surface": "#FFFFFF",
  "--theme-surface-muted": "#F5F5F4",
  "--theme-surface-dim": "#E7E5E4",
  "--theme-foreground": "#1A1A1A",
  "--theme-foreground-secondary": "#525252",
  "--theme-foreground-muted": "#A3A3A3",
  "--theme-foreground-inverse": "#FAFAF9",
  "--theme-border": "#D4D4D4",
  "--theme-border-light": "#E7E5E4",
};

/**
 * Coerce arbitrary (possibly partial/invalid) input into a safe, complete
 * theme. Invalid colors and unknown fields fall back to the default theme, so
 * a malformed or legacy payload can never break the customer site.
 */
export function sanitizeTheme(theme: ThemeColors | Partial<ThemeColors> | null | undefined): ThemeColors {
  const result: ThemeColors = { ...DEFAULT_THEME };
  if (!theme) return result;
  if (typeof theme.preset === "string" && theme.preset.trim()) {
    result.preset = theme.preset.trim();
  }
  for (const key of THEME_COLOR_KEYS) {
    const normalized = normalizeHex(theme[key as ThemeColorKey]);
    if (normalized) {
      result[key] = normalized;
    }
  }
  return result;
}

/**
 * Expand a 7-color semantic theme into the full CSS variable set. The untouched
 * default theme resolves to the exact original palette (pixel-identical until
 * an admin saves), while any edited color derives its hover/soft/dim shades.
 */
export function resolveThemeVars(theme: ThemeColors): ThemeVars {
  const colors = sanitizeTheme(theme);
  const isUntouchedDefault =
    colors.preset === DEFAULT_THEME.preset &&
    THEME_COLOR_KEYS.every((key) => colors[key] === DEFAULT_THEME[key]);
  if (isUntouchedDefault) {
    return { ...AUTO_ORANGE_VARS };
  }
  const blend = (a: string, b: string, weight: number) =>
    mix(a, b, weight).toLowerCase();
  const black = "#000000";
  const white = "#FFFFFF";
  return {
    "--theme-primary": colors.primary.toLowerCase(),
    "--theme-primary-hover": blend(colors.primary, black, 0.1),
    "--theme-primary-active": blend(colors.primary, black, 0.22),
    "--theme-primary-deep": blend(colors.primary, black, 0.34),
    "--theme-primary-light": blend(colors.primary, white, 0.25),
    "--theme-primary-soft": blend(colors.primary, white, 0.85),
    "--theme-secondary": colors.secondary.toLowerCase(),
    "--theme-secondary-soft": blend(colors.secondary, white, 0.06),
    "--theme-secondary-dim": blend(colors.secondary, white, 0.12),
    "--theme-secondary-border": blend(colors.secondary, white, 0.2),
    "--theme-secondary-deep": blend(colors.secondary, black, 0.05),
    "--theme-surface": colors.background.toLowerCase(),
    "--theme-surface-muted": blend(colors.background, black, 0.04),
    "--theme-surface-dim": blend(colors.background, black, 0.1),
    "--theme-foreground": colors.foreground.toLowerCase(),
    "--theme-foreground-secondary": blend(colors.foreground, colors.background, 0.24),
    "--theme-foreground-muted": blend(colors.foreground, colors.background, 0.55),
    "--theme-foreground-inverse": colors.accent.toLowerCase(),
    "--theme-border": colors.border.toLowerCase(),
    "--theme-border-light": blend(colors.border, colors.background, 0.5),
  };
}