import { describe, expect, it } from "vitest";
import {
  availabilityColor,
  availabilityLabel,
  formatPrice,
  truncate,
} from "./format";

describe("formatPrice", () => {
  it("formats a valid price string as INR", () => {
    expect(formatPrice("1299")).toBe("₹1,299");
  });

  it("formats a price with decimals as integer INR", () => {
    expect(formatPrice("4999.99")).toBe("₹5,000");
  });

  it("returns 'Contact for price' for null", () => {
    expect(formatPrice(null)).toBe("Contact for price");
  });

  it("returns 'Contact for price' for empty string", () => {
    expect(formatPrice("")).toBe("Contact for price");
  });

  it("returns raw string for non-numeric input", () => {
    expect(formatPrice("abc")).toBe("abc");
  });

  it("formats zero as ₹0", () => {
    expect(formatPrice("0")).toBe("₹0");
  });
});

describe("availabilityLabel", () => {
  it("returns human-readable labels", () => {
    expect(availabilityLabel("IN_STOCK")).toBe("In Stock");
    expect(availabilityLabel("OUT_OF_STOCK")).toBe("Out of Stock");
    expect(availabilityLabel("ON_ORDER")).toBe("On Order");
  });
});

describe("availabilityColor", () => {
  it("returns Tailwind classes for each status", () => {
    expect(availabilityColor("IN_STOCK")).toContain("green");
    expect(availabilityColor("OUT_OF_STOCK")).toContain("red");
    expect(availabilityColor("ON_ORDER")).toContain("amber");
  });
});

describe("truncate", () => {
  it("returns text unchanged when under limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns text unchanged when exactly at limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates with ellipsis when over limit", () => {
    expect(truncate("hello world", 6)).toBe("hello…");
  });

  it("trims trailing spaces before ellipsis", () => {
    expect(truncate("hello  world", 7)).toBe("hello…");
  });
});
