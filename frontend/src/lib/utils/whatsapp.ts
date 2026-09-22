/**
 * Build a WhatsApp wa.me URL with a prefilled message.
 */
export function buildWhatsAppUrl(
  phoneNumber: string,
  productName?: string,
  vehicleTag?: string,
): string {
  const cleaned = phoneNumber.replace(/[^0-9+]/g, "");
  let message = "Hi, I'm interested in your car accessories.";
  if (productName) {
    message = `Hi, I'm interested in ${productName}. Is this available?`;
    if (vehicleTag) {
      message += ` (Vehicle: ${vehicleTag})`;
    }
  }
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}
