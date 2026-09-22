import { createContext, useContext } from "react";
import type { ShopSettings } from "../types/api";

export interface ShopSettingsState {
  data: ShopSettings | null;
  loading: boolean;
  error: string | null;
}

export const ShopSettingsContext = createContext<ShopSettingsState>({
  data: null,
  loading: true,
  error: null,
});

export function useShopSettings(): ShopSettingsState {
  return useContext(ShopSettingsContext);
}

/** Helper: return true if a string field has content. */
export function hasContent(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
