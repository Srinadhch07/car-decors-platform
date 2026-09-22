import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TestWrapper } from "../../../test-utils";
import type { ShopSettings, ShopSettingsUpdatePayload } from "../../../types/api";
import ShopSettingsAdminPage from "./ShopSettingsAdminPage";

const shopSettings: ShopSettings = {
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
};

let failShop = false;
let failSave = false;
let shopCalls = 0;
let putBody: ShopSettingsUpdatePayload | null = null;

const server = setupServer(
  http.get("*/api/admin/shop", () => {
    shopCalls += 1;
    if (failShop) {
      return HttpResponse.json({ detail: "Failed to load shop settings" }, { status: 500 });
    }
    return HttpResponse.json(shopSettings);
  }),
  http.put("*/api/admin/shop", async ({ request }) => {
    putBody = (await request.json()) as ShopSettingsUpdatePayload;
    if (failSave) {
      return HttpResponse.json({ detail: "social_links: unsupported key" }, { status: 422 });
    }
    const updated: ShopSettings = {
      ...shopSettings,
      shop_name: putBody.shop_name ?? shopSettings.shop_name,
      email: putBody.email ?? null,
      business_hours: putBody.business_hours ?? null,
      logo_url: putBody.logo_url ?? null,
      social_links: putBody.social_links ?? shopSettings.social_links,
    };
    return HttpResponse.json(updated);
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  failShop = false;
  failSave = false;
  shopCalls = 0;
  putBody = null;
});
afterAll(() => server.close());

function renderPage() {
  return render(<ShopSettingsAdminPage />, {
    wrapper: ({ children }) => <TestWrapper initialEntries={["/admin/shop"]}>{children}</TestWrapper>,
  });
}

describe("ShopSettingsAdminPage", () => {
  it("loads and displays current settings in the form", async () => {
    renderPage();
    expect(await screen.findByDisplayValue(shopSettings.shop_name)).toBeInTheDocument();
    expect(screen.getByLabelText(/WhatsApp number/i)).toHaveValue(shopSettings.whatsapp_number);
    expect(screen.getByLabelText(/Phone/i)).toHaveValue(shopSettings.phone);
    expect(screen.getByLabelText(/Email/i)).toHaveValue(shopSettings.email);
    expect(screen.getByLabelText(/Address/i)).toHaveValue(shopSettings.address);
    expect(screen.getByLabelText(/Business hours/i)).toHaveValue(shopSettings.business_hours);
    expect(screen.getByLabelText(/Instagram/i)).toHaveValue(shopSettings.social_links.instagram);
    expect(screen.getByLabelText(/Facebook/i)).toHaveValue(shopSettings.social_links.facebook);
    expect(shopCalls).toBe(1);
  });

  it("marks required fields as required", async () => {
    renderPage();
    await screen.findByDisplayValue(shopSettings.shop_name);
    expect(screen.getByLabelText(/Shop name/i)).toHaveAttribute("required");
    expect(screen.getByLabelText(/WhatsApp number/i)).toHaveAttribute("required");
    expect(screen.getByLabelText(/Phone/i)).toHaveAttribute("required");
    expect(screen.getByLabelText(/Address/i)).toHaveAttribute("required");
  });

  it("shows a loading state while settings fetch", async () => {
    server.use(
      http.get("*/api/admin/shop", async () => {
        await delay(80);
        return HttpResponse.json(shopSettings);
      }),
    );
    renderPage();
    expect(screen.getByText("Loading shop settings…")).toBeInTheDocument();
    expect(await screen.findByDisplayValue(shopSettings.shop_name)).toBeInTheDocument();
  });

  it("shows a load error and Retry that recovers", async () => {
    const user = userEvent.setup();
    failShop = true;
    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/failed to load shop settings/i);

    failShop = false;
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByDisplayValue(shopSettings.shop_name)).toBeInTheDocument();
    expect(shopCalls).toBe(2);
  });

  it("saves edits with the exact snake_case payload", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue(shopSettings.shop_name);

    const nameInput = screen.getByLabelText(/Shop name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Shop settings saved.")).toBeInTheDocument();
    expect(putBody).toEqual({
      shop_name: "New Name",
      whatsapp_number: shopSettings.whatsapp_number,
      phone: shopSettings.phone,
      email: shopSettings.email,
      address: shopSettings.address,
      business_hours: shopSettings.business_hours,
      logo_url: null,
      social_links: shopSettings.social_links,
    });
  });

  it("sends null for optional fields that are cleared", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue(shopSettings.shop_name);

    const emailInput = screen.getByLabelText(/Email/i);
    await user.clear(emailInput);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText("Shop settings saved.");
    expect(putBody?.email).toBeNull();
    expect(putBody?.logo_url).toBeNull();
  });

  it("includes filled social links and omits empty ones", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue(shopSettings.shop_name);

    await user.type(screen.getByLabelText(/Website/i), "https://example.com");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await screen.findByText("Shop settings saved.");
    expect(putBody?.social_links).toEqual({
      instagram: shopSettings.social_links.instagram,
      facebook: shopSettings.social_links.facebook,
      website: "https://example.com",
    });
  });

  it("shows a save error returned by the backend", async () => {
    const user = userEvent.setup();
    failSave = true;
    renderPage();
    await screen.findByDisplayValue(shopSettings.shop_name);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("social_links: unsupported key");
    expect(screen.queryByText("Shop settings saved.")).not.toBeInTheDocument();
  });

  it("re-renders the form from the server response after saving", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByDisplayValue(shopSettings.shop_name);

    const nameInput = screen.getByLabelText(/Shop name/i);
    fireEvent.change(nameInput, { target: { value: "Refreshed Name" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByDisplayValue("Refreshed Name")).toBeInTheDocument();
    expect(putBody?.shop_name).toBe("Refreshed Name");
  });
});