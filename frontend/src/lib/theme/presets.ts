import type { ThemeColors } from "../../types/api";

/** Default theme — mirrors the original static palette exactly. */
export const DEFAULT_THEME: ThemeColors = {
  preset: "automotive-orange",
  primary: "#F97316",
  secondary: "#111111",
  accent: "#FFFFFF",
  background: "#FFFFFF",
  foreground: "#1A1A1A",
  muted: "#525252",
  border: "#D4D4D4",
};

/** Semantic color keys (everything except `preset`). */
export const THEME_COLOR_KEYS = [
  "primary",
  "secondary",
  "accent",
  "background",
  "foreground",
  "muted",
  "border",
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

export interface ThemePreset {
  id: string;
  label: string;
  colors: ThemeColors;
}

function presetColors(preset: string, values: Omit<ThemeColors, "preset">): ThemeColors {
  return { preset, ...values };
}

const AUTO_ORANGE: Omit<ThemeColors, "preset"> = {
  primary: DEFAULT_THEME.primary,
  secondary: DEFAULT_THEME.secondary,
  accent: DEFAULT_THEME.accent,
  background: DEFAULT_THEME.background,
  foreground: DEFAULT_THEME.foreground,
  muted: DEFAULT_THEME.muted,
  border: DEFAULT_THEME.border,
};

/** Curated automotive color themes. "Custom" keeps current colors when chosen. */
export const THEME_PRESETS: ThemePreset[] = [
  { id: "automotive-orange", label: "Automotive Orange", colors: presetColors("automotive-orange", AUTO_ORANGE) },
  {
    id: "midnight-black",
    label: "Midnight Black",
    colors: presetColors("midnight-black", {
      primary: "#F59E0B",
      secondary: "#0A0A0A",
      accent: "#FFFFFF",
      background: "#101010",
      foreground: "#F5F5F5",
      muted: "#A1A1AA",
      border: "#3F3F46",
    }),
  },
  {
    id: "racing-red",
    label: "Racing Red",
    colors: presetColors("racing-red", {
      primary: "#DC2626",
      secondary: "#0A0A0A",
      accent: "#FFFFFF",
      background: "#FAFAFA",
      foreground: "#1C1917",
      muted: "#6B7280",
      border: "#E5E7EB",
    }),
  },
  {
    id: "electric-blue",
    label: "Electric Blue",
    colors: presetColors("electric-blue", {
      primary: "#2563EB",
      secondary: "#0F172A",
      accent: "#FFFFFF",
      background: "#FFFFFF",
      foreground: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",
    }),
  },
  {
    id: "luxury-gold",
    label: "Luxury Gold",
    colors: presetColors("luxury-gold", {
      primary: "#D97706",
      secondary: "#1C1917",
      accent: "#FFFFFF",
      background: "#FFFBEB",
      foreground: "#292524",
      muted: "#78716C",
      border: "#E7E5E4",
    }),
  },
  { id: "custom", label: "Custom", colors: presetColors("custom", AUTO_ORANGE) },
];

export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}