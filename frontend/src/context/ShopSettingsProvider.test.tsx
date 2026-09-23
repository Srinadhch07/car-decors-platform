import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME } from "../lib/theme";
import { mockShopSettings } from "../test-utils";
import { useShopSettings } from "./ShopSettingsContext";
import { ShopSettingsProvider } from "./ShopSettingsProvider";

const { getShopSettings } = vi.hoisted(() => ({
  getShopSettings: vi.fn(),
}));

vi.mock("../lib/api/client", () => ({
  api: { getShopSettings },
}));

function Probe() {
  const state = useShopSettings();
  return (
    <div>
      <span data-testid="load">{state.loading ? "loading" : "done"}</span>
      <span data-testid="theme">{state.theme?.primary ?? "none"}</span>
    </div>
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("style");
  getShopSettings.mockReset();
});

describe("ShopSettingsProvider", () => {
  it("applies the saved theme to the document root", async () => {
    const custom = {
      ...DEFAULT_THEME,
      preset: "racing-red",
      primary: "#DC2626",
      background: "#FAFAFA",
    };
    getShopSettings.mockResolvedValueOnce({ ...mockShopSettings, theme: custom });

    render(
      <ShopSettingsProvider>
        <Probe />
      </ShopSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("load")).toHaveTextContent("done"));
    expect(screen.getByTestId("theme")).toHaveTextContent("#DC2626");
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#dc2626");
    expect(document.documentElement.style.getPropertyValue("--theme-surface")).toBe("#fafafa");
  });

  it("exposes the default theme when settings load without one", async () => {
    const { theme: _theme, ...withoutTheme } = mockShopSettings;
    getShopSettings.mockResolvedValueOnce(withoutTheme);

    render(
      <ShopSettingsProvider>
        <Probe />
      </ShopSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("load")).toHaveTextContent("done"));
    expect(screen.getByTestId("theme")).toHaveTextContent("none");
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#F97316");
  });

  it("falls back to the default palette when loading fails", async () => {
    getShopSettings.mockRejectedValueOnce(new Error("network down"));

    render(
      <ShopSettingsProvider>
        <Probe />
      </ShopSettingsProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("load")).toHaveTextContent("done"));
    expect(screen.getByTestId("theme")).toHaveTextContent("none");
    expect(document.documentElement.style.getPropertyValue("--theme-primary")).toBe("#F97316");
  });
});