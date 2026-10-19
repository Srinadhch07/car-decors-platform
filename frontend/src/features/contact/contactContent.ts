/**
 * Static copy and limits for the Contact page.
 *
 * Business-specific values (name, phone, address, WhatsApp, email, social links)
 * always come from admin-managed shop settings — nothing configurable is
 * duplicated here.
 */

export const HERO_HEADING_LEAD = "Let's Talk About";
export const HERO_HEADING_ACCENT = "Your Next Drive.";
export const HERO_SUPPORT =
  "Looking for accessories for your car or have a question about a product? We're here to help.";

export const QUICK_HEADING = "Reach Us the Way You Prefer";
export const QUICK_SUPPORT = "Call, message or visit — pick whatever is easiest for you.";

export const ENQUIRY_HEADING = "Send Us an Enquiry";
export const ENQUIRY_SUPPORT =
  "Tell us what you need and we'll prepare your message to send through your chosen channel.";

export const STORE_HEADING = "Visit Us in Karimnagar";
export const STORE_SUPPORT =
  "Prefer to see things in person? Stop by and we'll help you find the right accessories for your car.";

export const SOCIAL_HEADING = "Stay Connected";
export const SOCIAL_SUPPORT = "Follow us for new arrivals, offers and updates.";

export const CLOSING_HEADING = "Your Next Upgrade Starts Here.";
export const CLOSING_SUPPORT =
  "Explore our collection or contact us about your requirements.";

/** Field length limits (matched by maxLength + validation). */
export const MAX_NAME = 80;
export const MAX_CONTACT = 120;
export const MAX_MESSAGE = 1000;

/** Optional enquiry subjects used to shape the composed message. */
export const ENQUIRY_SUBJECTS = [
  "Product availability",
  "Price enquiry",
  "Installation & fitting",
  "Order or delivery",
  "General question",
] as const;
