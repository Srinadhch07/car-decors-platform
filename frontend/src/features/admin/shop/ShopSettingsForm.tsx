import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { sanitizeTheme } from "../../../lib/theme";
import type {
  ShopSettings,
  ShopSettingsUpdatePayload,
  ThemeColors,
} from "../../../types/api";
import { ThemeEditor } from "./ThemeEditor";

export const SOCIAL_LINK_KEYS = [
  "instagram",
  "facebook",
  "twitter",
  "youtube",
  "linkedin",
  "telegram",
  "whatsapp",
  "website",
] as const;

export const SOCIAL_LINK_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  website: "Website",
};

interface FormValues {
  shop_name: string;
  whatsapp_number: string;
  phone: string;
  email: string;
  address: string;
  business_hours: string;
  logo_url: string;
  social_links: Record<string, string>;
  theme: ThemeColors;
}

function valuesFromSettings(s: ShopSettings): FormValues {
  return {
    shop_name: s.shop_name,
    whatsapp_number: s.whatsapp_number,
    phone: s.phone,
    email: s.email ?? "",
    address: s.address,
    business_hours: s.business_hours ?? "",
    logo_url: s.logo_url ?? "",
    social_links: Object.fromEntries(
      SOCIAL_LINK_KEYS.map((key) => [key, s.social_links[key] ?? ""]),
    ),
    theme: sanitizeTheme(s.theme),
  };
}

function buildPayload(v: FormValues): ShopSettingsUpdatePayload {
  const social = Object.fromEntries(
    Object.entries(v.social_links)
      .filter(([, value]) => value.trim().length > 0)
      .map(([key, value]) => [key, value.trim()]),
  );
  const payload: ShopSettingsUpdatePayload = {
    shop_name: v.shop_name.trim(),
    whatsapp_number: v.whatsapp_number.trim(),
    phone: v.phone.trim(),
    email: v.email.trim().length > 0 ? v.email.trim() : null,
    address: v.address.trim(),
    business_hours: v.business_hours.trim().length > 0 ? v.business_hours.trim() : null,
    logo_url: v.logo_url.trim().length > 0 ? v.logo_url.trim() : null,
    theme: sanitizeTheme(v.theme),
  };
  if (Object.keys(social).length > 0) {
    payload.social_links = social;
  }
  return payload;
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url" | "email" | "tel";
  required?: boolean;
  textarea?: boolean;
  placeholder?: string;
}

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30";

function Field({ id, label, value, onChange, type = "text", required, textarea, placeholder }: FieldProps) {
  const idAttr = `shop-settings-${id}`;
  return (
    <div>
      <label htmlFor={idAttr} className="mb-1 block text-sm font-medium text-text-primary">
        {label}
        {required && (
          <span className="text-orange-600" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {textarea ? (
        <textarea
          id={idAttr}
          rows={3}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldClass} resize-y`}
        />
      ) : (
        <input
          id={idAttr}
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClass}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

export interface ShopSettingsFormProps {
  initial: ShopSettings;
  saving: boolean;
  error: string | null;
  onSave: (payload: ShopSettingsUpdatePayload) => void;
}

export function ShopSettingsForm({ initial, saving, error, onSave }: ShopSettingsFormProps) {
  const [values, setValues] = useState<FormValues>(() => valuesFromSettings(initial));

  // Re-sync when the server returns a fresh copy after saving.
  useEffect(() => {
    setValues(valuesFromSettings(initial));
  }, [initial]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setSocialLink(key: string, value: string) {
    setValues((v) => ({ ...v, social_links: { ...v.social_links, [key]: value } }));
  }

  function resetTheme() {
    setValues((v) => ({ ...v, theme: sanitizeTheme(initial.theme) }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(buildPayload(values));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" aria-label="Shop settings form">
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">General</h2>
        <Field
          id="shop_name"
          label="Shop name"
          value={values.shop_name}
          onChange={(v) => setField("shop_name", v)}
          required
        />
        <Field
          id="logo_url"
          label="Logo URL"
          type="url"
          value={values.logo_url}
          onChange={(v) => setField("logo_url", v)}
          placeholder="https://example.com/logo.png"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="whatsapp_number"
            label="WhatsApp number"
            type="tel"
            value={values.whatsapp_number}
            onChange={(v) => setField("whatsapp_number", v)}
            required
          />
          <Field
            id="phone"
            label="Phone"
            type="tel"
            value={values.phone}
            onChange={(v) => setField("phone", v)}
            required
          />
        </div>
        <Field
          id="email"
          label="Email"
          type="email"
          value={values.email}
          onChange={(v) => setField("email", v)}
          placeholder="Leave blank to clear"
        />
        <Field
          id="address"
          label="Address"
          value={values.address}
          onChange={(v) => setField("address", v)}
          textarea
          required
        />
        <Field
          id="business_hours"
          label="Business hours"
          value={values.business_hours}
          onChange={(v) => setField("business_hours", v)}
          placeholder="e.g. Mon-Sat: 9AM-8PM"
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">Social links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_LINK_KEYS.map((key) => (
            <Field
              key={key}
              id={`social_${key}`}
              label={SOCIAL_LINK_LABELS[key]}
              type="url"
              value={values.social_links[key] ?? ""}
              onChange={(v) => setSocialLink(key, v)}
              placeholder={`https://${key}.com/...`}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Website theme</h2>
          <button
            type="button"
            onClick={resetTheme}
            className="text-sm font-medium text-orange-600 hover:text-orange-700"
          >
            Reset colors
          </button>
        </div>
        <p className="text-sm text-text-secondary">
          Preview changes here and save with the button below; the customer website
          updates immediately after you save.
        </p>
        <ThemeEditor value={values.theme} onChange={(theme) => setField("theme", theme)} />
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 active:bg-orange-800 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}