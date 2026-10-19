import { describe, expect, it } from "vitest";
import {
  buildDirectionsUrl,
  buildEnquiryText,
  buildMailtoEnquiryUrl,
  buildWhatsAppEnquiryUrl,
  isValidContact,
} from "./enquiry";

describe("isValidContact", () => {
  it("accepts email addresses", () => {
    expect(isValidContact("ravi@example.com")).toBe(true);
  });

  it("accepts phone numbers", () => {
    expect(isValidContact("+91 98765 43210")).toBe(true);
    expect(isValidContact("09876543210")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isValidContact("nope")).toBe(false);
    expect(isValidContact("12345")).toBe(false);
    expect(isValidContact("")).toBe(false);
  });
});

describe("buildEnquiryText", () => {
  it("includes all provided fields", () => {
    const text = buildEnquiryText(
      { name: "Ravi", contact: "ravi@example.com", subject: "Price enquiry", message: "Need a mat." },
      { shopName: "Venkata Ramana Real Value Car Decors" },
    );
    expect(text).toContain("Venkata Ramana Real Value Car Decors");
    expect(text).toContain("Name: Ravi");
    expect(text).toContain("Contact: ravi@example.com");
    expect(text).toContain("Subject: Price enquiry");
    expect(text).toContain("Need a mat.");
  });

  it("omits the contact/subject lines when empty", () => {
    const text = buildEnquiryText({ name: "Ravi", contact: "", subject: "", message: "Hi" });
    expect(text).not.toContain("Contact:");
    expect(text).not.toContain("Subject:");
  });
});

describe("channel URLs", () => {
  it("builds a wa.me link with an encoded message", () => {
    const url = buildWhatsAppEnquiryUrl("+91 98765 43210", "Hello there");
    expect(url.startsWith("https://wa.me/+919876543210?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Hello there");
  });

  it("builds a mailto link with subject and body", () => {
    const url = buildMailtoEnquiryUrl("info@vrcardecors.in", "Price enquiry", "Hello");
    expect(url.startsWith("mailto:info@vrcardecors.in?")).toBe(true);
    expect(url).toContain("subject=Price%20enquiry");
    expect(url).toContain("body=");
  });

  it("falls back to a default subject for mailto", () => {
    expect(buildMailtoEnquiryUrl("a@b.com", "  ", "hi")).toContain("subject=Website%20enquiry");
  });

  it("builds an encoded maps search URL", () => {
    expect(buildDirectionsUrl("123 Main Street, Chennai")).toBe(
      "https://www.google.com/maps/search/?api=1&query=123%20Main%20Street%2C%20Chennai",
    );
  });
});
