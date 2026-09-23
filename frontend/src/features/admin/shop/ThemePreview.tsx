import { useEffect, useRef } from "react";
import { applyThemeToElement, resolveThemeVars } from "../../../lib/theme";
import type { ThemeColors } from "../../../types/api";

/**
 * Scoped live preview of a website theme. Theme variables are applied to the
 * wrapper element only, so editing here never changes the real site (the
 * customer palette stays untouched until "Save changes" is pressed).
 */
export function ThemePreview({ theme }: { theme: ThemeColors }) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scopeRef.current) {
      applyThemeToElement(scopeRef.current, resolveThemeVars(theme));
    }
  }, [theme]);

  return (
    <div
      ref={scopeRef}
      aria-label="Website theme preview"
      className="space-y-4 rounded-lg border border-border bg-surface p-4"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-text-primary">Preview heading</h3>
        <p className="text-sm text-text-secondary">
          Body text sample. Change a color and watch this panel update instantly.
        </p>
        <p className="text-xs text-text-muted">Muted caption text</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
        >
          Primary
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-dark-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-dark-800"
        >
          Secondary
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-primary"
        >
          Outline
        </button>
      </div>

      <div className="rounded-md border border-border bg-white p-3 shadow-card">
        <p className="text-sm font-semibold text-text-primary">Featured card</p>
        <p className="mt-1 text-xs text-text-secondary">Card body with border and shadow.</p>
      </div>

      <div className="flex items-center gap-2 rounded-md bg-dark-900 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-500" aria-hidden="true" />
        <p className="text-xs font-medium text-text-inverse">Accent chip on a dark section</p>
      </div>
    </div>
  );
}