import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("builds a basic wa.me URL with default message", () => {
    const url = buildWhatsAppUrl("+919876543210");
    expect(url).toMatch(/^https:\/\/wa\.me\/\+919876543210\?text=/);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(
      "Hi, I'm interested in your car accessories.",
    );
  });

  it("includes product name in message", () => {
    const url = buildWhatsAppUrl("919876543210", "Floor Mats");
    const msg = decodeURIComponent(url.split("?text=")[1]);
    expect(msg).toBe("Hi, I'm interested in Floor Mats. Is this available?");
  });

  it("includes vehicle tag when product name is present", () => {
    const url = buildWhatsAppUrl("919876543210", "Floor Mats", "Swift");
    const msg = decodeURIComponent(url.split("?text=")[1]);
    expect(msg).toBe(
      "Hi, I'm interested in Floor Mats. Is this available? (Vehicle: Swift)",
    );
  });

  it("strips non-numeric characters from phone number", () => {
    const url = buildWhatsAppUrl("+91 (987) 654-3210");
    expect(url).toContain("wa.me/+919876543210");
  });
});
