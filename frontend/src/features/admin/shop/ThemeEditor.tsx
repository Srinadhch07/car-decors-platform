import {
  DEFAULT_THEME,
  THEME_COLOR_KEYS,
  THEME_PRESETS,
  getPresetById,
  normalizeHex,
  themeContrastWarnings,
} from "../../../lib/theme";
import type { ThemeColorKey } from "../../../lib/theme";
import type { ThemeColors } from "../../../types/api";
import { ThemePreview } from "./ThemePreview";

const COLOR_FIELD_LABELS: Record<ThemeColorKey, string> = {
  primary: "Brand color",
  secondary: "Dark surfaces",
  accent: "Contrast text",
  background: "Page background",
  foreground: "Body text",
  muted: "Secondary text",
  border: "Borders & dividers",
};

const inputClass =
  "rounded-md border border-border bg-white px-2 py-1.5 text-sm text-text-primary focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

const selectClass =
  "w-full rounded-md border border-border bg-white px-3 py-2.5 text-sm text-text-primary focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const safeValue = normalizeHex(value) ?? DEFAULT_THEME.primary;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="w-40 shrink-0 text-sm font-medium text-text-primary">{label}</label>
        <input
          type="color"
          aria-label={`${label} color picker`}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          aria-label={`${label} hex code`}
          className={`${inputClass} w-28 min-w-0`}
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
  );
}

export interface ThemeEditorProps {
  value: ThemeColors;
  onChange: (theme: ThemeColors) => void;
}

/**
 * Website Theme editor. Editing only touches local form state (reflected in the
 * scoped preview); nothing is applied to the customer site until the form's
 * "Save changes" action sends the full theme to the backend.
 */
export function ThemeEditor({ value, onChange }: ThemeEditorProps) {
  function applyPreset(id: string) {
    const preset = getPresetById(id);
    if (!preset) {
      return;
    }
    if (id === "custom") {
      onChange({ ...value, preset: "custom" });
      return;
    }
    onChange({ ...preset.colors, preset: id });
  }

  function setColor(key: ThemeColorKey, hex: string) {
    onChange({ ...value, [key]: hex });
  }

  const warnings = themeContrastWarnings(value);
  const activePreset = THEME_PRESETS.some((preset) => preset.id === value.preset)
    ? value.preset
    : "automotive-orange";

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="shop-settings-theme-preset"
          className="mb-1 block text-sm font-medium text-text-primary"
        >
          Preset
        </label>
        <select
          id="shop-settings-theme-preset"
          aria-label="Website theme preset"
          className={selectClass}
          value={activePreset}
          onChange={(e) => applyPreset(e.target.value)}
        >
          {THEME_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_COLOR_KEYS.map((key) => (
          <ColorField
            key={key}
            label={COLOR_FIELD_LABELS[key]}
            value={value[key]}
            onChange={(hex) => setColor(key, hex)}
          />
        ))}
      </div>

      {warnings.length > 0 && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          <p className="mb-1 font-medium">Accessibility warning</p>
          <ul className="list-inside list-disc space-y-0.5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">
          Preview (scoped — the customer site only changes after you save)
        </p>
        <ThemePreview theme={value} />
      </div>
    </div>
  );
}