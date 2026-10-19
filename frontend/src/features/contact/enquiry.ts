/**
 * Enquiry composition helpers for the Contact page.
 *
 * IMPORTANT: this project has no backend contact/enquiry endpoint, so the
 * "form" never POSTs anywhere. Instead it composes a plain-text enquiry and
 * hands it off to a real, configured channel (WhatsApp deep link or the user's
 * email client). These helpers are pure and unit-tested.
 */

export interface EnquiryFields {
  name: string;
  contact: string;
  subject: string;
  message: string;
}

export interface EnquiryTextOptions {
  shopName?: string | null;
  brand?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s\-()]{5,}$/;

/** Accept either a valid email address or a plausible phone number. */
export function isValidContact(value: string): boolean {
  const trimmed = value.trim();
  return EMAIL_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed);
}

/** Build the friendly, readable message shared with WhatsApp or email. */
export function buildEnquiryText(
  fields: EnquiryFields,
  options: EnquiryTextOptions = {},
): string {
  const greetingName = options.shopName?.trim() || options.brand?.trim();
  const lines: string[] = [];

  lines.push(
    greetingName
      ? `Hi ${greetingName}, I'd like to enquire about your car accessories.`
      : "Hi, I'd like to enquire about your car accessories.",
  );
  lines.push("");
  lines.push(`Name: ${fields.name.trim()}`);
  if (fields.contact.trim()) {
    lines.push(`Contact: ${fields.contact.trim()}`);
  }
  if (fields.subject.trim()) {
    lines.push(`Subject: ${fields.subject.trim()}`);
  }
  lines.push("");
  lines.push(fields.message.trim());

  return lines.join("\n");
}

/** WhatsApp deep link carrying a custom, pre-composed message. */
export function buildWhatsAppEnquiryUrl(phoneNumber: string, message: string): string {
  const cleaned = phoneNumber.replace(/[^0-9+]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/** mailto: link carrying a subject and the composed enquiry body. */
export function buildMailtoEnquiryUrl(
  email: string,
  subject: string,
  body: string,
): string {
  const safeSubject = subject.trim() || "Website enquiry";
  return `mailto:${email}?subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(body)}`;
}

/** Google Maps search deep link derived only from the configured address. */
export function buildDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}
