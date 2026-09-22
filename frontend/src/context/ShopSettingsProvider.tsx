import { useEffect, useState } from "react";
import { api } from "../lib/api/client";
import { ShopSettingsContext, type ShopSettingsState } from "./ShopSettingsContext";

interface ShopSettingsProviderProps {
  children: React.ReactNode;
}

export function ShopSettingsProvider({ children }: ShopSettingsProviderProps) {
  const [state, setState] = useState<ShopSettingsState>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.getShopSettings();
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load shop info";
          setState({ data: null, loading: false, error: message });
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
