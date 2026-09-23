import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { ShopSettingsContext, type ShopSettingsState } from "./context/ShopSettingsContext";
import { DEFAULT_THEME } from "./lib/theme";
import type { ShopSettings } from "./types/api";

export const mockShopSettings: ShopSettings = {
  shop_name: "SLG Car Decors",
  whatsapp_number: "+919876543210",
  phone: "+919876543210",
  email: "contact@slg.com",
  address: "123 Main Street, Chennai",
  business_hours: "Mon-Sat: 9AM-8PM",
  social_links: {
    instagram: "https://instagram.com/slg",
    facebook: "https://facebook.com/slg",
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
  initialEntries?: string[];
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
