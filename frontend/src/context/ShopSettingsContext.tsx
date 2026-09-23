import { createContext, useContext } from "react";
import type { ShopSettings, ThemeColors } from "../types/api";

export interface ShopSettingsState {
  data: ShopSettings | null;
  loading: boolean;
  error: string | null;
  /** The active website theme (null until shop settings load). */
  theme: ThemeColors | null;
}

export const ShopSettingsContext = createContext<ShopSettingsState>({
  data: null,
  loading: true,
  error: null,
  theme: null,
});

export function useShopSettings(): ShopSettingsState {
  return useContext(ShopSettingsContext);
}

/** Helper: return true if a string field has content. */
export function hasContent(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
