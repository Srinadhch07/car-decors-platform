import { useEffect, useState } from "react";
import { api } from "../lib/api/client";
import { applyTheme } from "../lib/theme";
import { ShopSettingsContext, type ShopSettingsState } from "./ShopSettingsContext";

interface ShopSettingsProviderProps {
  children: React.ReactNode;
}

export function ShopSettingsProvider({ children }: ShopSettingsProviderProps) {
  const [state, setState] = useState<ShopSettingsState>({
    data: null,
    loading: true,
    error: null,
    theme: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.getShopSettings();
        if (!cancelled) {
          // Apply the saved website theme; missing/invalid falls back to the
          // palette baked into index.css (no flash of wrong colors).
          applyTheme(data?.theme);
          setState({ data, loading: false, error: null, theme: data?.theme ?? null });
        }
      } catch (err) {
        if (!cancelled) {
          applyTheme(null);
          const message =
            err instanceof Error ? err.message : "Failed to load shop info";
          setState({ data: null, loading: false, error: message, theme: null });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ShopSettingsContext value={state}>
      {children}
    </ShopSettingsContext>
  );
}
