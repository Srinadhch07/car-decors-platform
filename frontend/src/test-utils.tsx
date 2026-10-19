import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { ShopSettingsContext, type ShopSettingsState } from "./context/ShopSettingsContext";
import { DEFAULT_THEME } from "./lib/theme";
import type { ShopSettings } from "./types/api";

/** A memory-router entry: a plain path, or an object carrying location state. */
export type RouterEntry =
  | string
  | { pathname: string; search?: string; hash?: string; state?: unknown };

export const mockShopSettings: ShopSettings = {
  shop_name: "Venkata Ramana Real Value Car Decors",
  whatsapp_number: "+91-1234567890",
  phone: "+91-1234567890",
  email: "info@vrcardecors.in",
  address: "123 Main Street, Chennai",
  business_hours: "Mon-Sat: 9AM-8PM",
  social_links: {
    instagram: "https://instagram.com/vrcardecors",
    facebook: "https://facebook.com/vrcardecors",
  },
  logo_url: null,
  theme: { ...DEFAULT_THEME },
};

export function createMockState(
  overrides: Partial<ShopSettingsState> = {},
): ShopSettingsState {
  return {
    data: mockShopSettings,
    loading: false,
    error: null,
    theme: mockShopSettings.theme ?? null,
    ...overrides,
  };
}

interface WrapperProps {
  children: ReactNode;
  initialEntries?: RouterEntry[];
  shopState?: ShopSettingsState;
}

export function TestWrapper({
  children,
  initialEntries = ["/"],
  shopState,
}: WrapperProps) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ShopSettingsContext value={shopState ?? createMockState()}>
        {children}
      </ShopSettingsContext>
    </MemoryRouter>
  );
}
