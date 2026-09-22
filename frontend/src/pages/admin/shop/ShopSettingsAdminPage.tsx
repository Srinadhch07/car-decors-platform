import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, api } from "../../../lib/api/client";
import type { ShopSettings, ShopSettingsUpdatePayload } from "../../../types/api";
import { ShopSettingsForm } from "../../../features/admin/shop";

function saveErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  return err instanceof Error ? err.message : "Failed to save shop settings";
}

export function ShopSettingsAdminPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.adminGetShop();
      setSettings(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load shop settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    document.title = "Shop Settings | Car Decor Admin";
  }, []);

  async function handleSave(payload: ShopSettingsUpdatePayload) {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await api.adminUpdateShop(payload);
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(saveErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6" aria-label="Shop settings">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Shop Settings
        </h1>
        <p className="mt-1 text-text-secondary">
          Update storefront contact details, hours, social links and branding.
        </p>
      </header>

      {saved && !saving && (
        <div
          role="status"
          className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
        >
          Shop settings saved.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-8 text-text-muted" aria-busy="true">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-orange-500" />
          <span className="text-sm">Loading shop settings…</span>
        </div>
      )}

      {!loading && loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && settings && (
        <div className="rounded-lg border border-border-light bg-white p-5 shadow-card sm:p-6">
          <ShopSettingsForm
            initial={settings}
            saving={saving}
            error={saveError}
            onSave={(payload) => void handleSave(payload)}
          />
        </div>
      )}
    </section>
  );
}

export default ShopSettingsAdminPage;