import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  contrastRatio,
  normalizeHex,
  resolveThemeVars,
  sanitizeTheme,
  themeContrastWarnings,
  applyTheme,
  THEME_VAR_NAMES,
} from "./index";

describe("normalizeHex", () => {
  it("accepts 6-digit hex in any case", () => {
    expect(normalizeHex("#f97316")).toBe("#F97316");
    expect(normalizeHex("#F97316")).toBe("#F97316");
  });

  it("rejects anything that is not a 6-digit hex color", () => {
    for (const value of [
      "red",
      "#12345",
      "#1234567",
      "#GGGGGG",
      "url(https://evil.example/x.css)",
      "javascript:alert(1)",
      "<script>alert(1)</script>",
      "expression(alert(1))",
      "",
      null,
    ]) {
      expect(normalizeHex(value), String(value)).toBeNull();
    }
  });
});

describe("contrastRatio", () => {
  it("returns 21:1 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("returns 1:1 for identical colors", () => {
    expect(contrastRatio("#1A1A1A", "#1A1A1A")).toBeCloseTo(1, 3);
  });
});

describe("sanitizeTheme", () => {
  it("falls back to defaults when nothing is supplied", () => {
    expect(sanitizeTheme(null)).toEqual(DEFAULT_THEME);
    expect(sanitizeTheme(undefined)).toEqual(DEFAULT_THEME);
  });

  it("replaces invalid colors with defaults and keeps valid ones", () => {
    const result = sanitizeTheme({
      preset: "racing-red",
      primary: "#dc2626",
      foreground: "not a color",
    });
    expect(result.preset).toBe("racing-red");
    expect(result.primary).toBe("#DC2626");
    expect(result.foreground).toBe(DEFAULT_THEME.foreground);
  });
});

describe("resolveThemeVars", () => {
  it("emits every theme variable", () => {
    const vars = resolveThemeVars(DEFAULT_THEME);
    for (const name of THEME_VAR_NAMES) {
      expect(vars[name], name).toBeTruthy();
    }
  });

  it("offers the untouched default theme exactly as the original palette", () => {
    const vars = resolveThemeVars(DEFAULT_THEME);
    expect(vars["--theme-primary"]).toBe("#F97316");
    expect(vars["--theme-primary-hover"]).toBe("#EA580C");
    expect(vars["--theme-primary-active"]).toBe("#C2410C");
    expect(vars["--theme-primary-soft"]).toBe("#FFF7ED");
    expect(vars["--theme-secondary"]).toBe("#111111");
    expect(vars["--theme-surface"]).toBe("#FFFFFF");
    expect(vars["--theme-foreground"]).toBe("#1A1A1A");
    expect(vars["--theme-border"]).toBe("#D4D4D4");
  });

  it("derives shades from edited colors instead of ignoring them", () => {
    const vars = resolveThemeVars({ ...DEFAULT_THEME, primary: "#DC2626" });
    expect(vars["--theme-primary"]).toBe("#dc2626");
    // hover is darker than the base color
    expect(vars["--theme-primary-hover"] < vars["--theme-primary"]).toBe(true);
  });

  it("derives a full ramp for other presets", () => {
    const vars = resolveThemeVars({
      ...DEFAULT_THEME,
      preset: "racing-red",
      primary: "#DC2626",
      background: "#FAFAFA",
    });
    expect(vars["--theme-surface"]).toBe("#fafafa");
    expect(vars["--theme-primary-hover"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(vars["--theme-primary-light"]).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("themeContrastWarnings", () => {
  it("does not warn for the default theme", () => {
    expect(themeContrastWarnings(DEFAULT_THEME)).toEqual([]);
  });

  it("warns when body text has too little contrast", () => {
    const warnings = themeContrastWarnings({
      ...DEFAULT_THEME,
      foreground: "#FFFFFF",
      background: "#FFFFFF",
    });
    expect(warnings.some((w) => w.includes("Body text"))).toBe(true);
  });
});

describe("applyTheme", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
  });

  it("writes theme variables onto the document root", () => {
    applyTheme({ ...DEFAULT_THEME, preset: "racing-red", primary: "#DC2626" });
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#dc2626");
    expect(document.documentElement.style.getPropertyValue("--theme-surface")).toBe("#ffffff");
  });

  it("restores defaults for a missing/invalid theme", () => {
    applyTheme(null);
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#F97316");
  });
});