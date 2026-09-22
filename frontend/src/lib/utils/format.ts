import type { ProductAvailability } from "../../types/api";

/**
 * Format a price string for display. Returns "Contact for price" when null.
 */
export function formatPrice(price: string | null): string {
  if (!price) return "Contact for price";
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Return a human-readable label for an availability status.
 */
export function availabilityLabel(status: ProductAvailability): string {
  switch (status) {
    case "IN_STOCK":
      return "In Stock";
    case "OUT_OF_STOCK":
      return "Out of Stock";
    case "ON_ORDER":
      return "On Order";
  }
}

/**
 * Return Tailwind color class for an availability status.
 */
export function availabilityColor(status: ProductAvailability): string {
  switch (status) {
    case "IN_STOCK":
      return "bg-green-100 text-green-800";
    case "OUT_OF_STOCK":
      return "bg-red-100 text-red-700";
    case "ON_ORDER":
      return "bg-amber-100 text-amber-700";
  }
}

/**
 * Truncate text to a given length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + "…";
}
