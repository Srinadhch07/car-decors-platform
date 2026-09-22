import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Car, Menu, Phone, X } from "lucide-react";
import { useShopSettings } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { data: shop } = useShopSettings();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close mobile menu on route change (via Escape) and on resize to desktop
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        closeMobile();
        menuButtonRef.current?.focus();
      }
    }
    function onResize() {
      if (window.innerWidth >= 768) closeMobile();
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [mobileOpen, closeMobile]);

  // Trap focus in mobile menu when open
  useEffect(() => {
    if (!mobileOpen) return;
    const menu = mobileMenuRef.current;
    if (!menu) return;
    const focusable = menu.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [mobileOpen]);

  const hasPhone = shop?.phone && shop.phone.trim().length > 0;
  const hasWhatsApp = shop?.whatsapp_number && shop.whatsapp_number.trim().length > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-border-light bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-page flex h-16 items-center justify-between">
        {/* Logo / Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold tracking-tight text-dark-900"
          aria-label={`${shop?.shop_name ?? "Home"} — Home`}
        >
          {shop?.logo_url ? (
            <img
              src={shop.logo_url}
              alt=""
              className="h-8 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Car className="h-6 w-6 text-orange-600" />
          )}
          <span className="text-lg">{shop?.shop_name ?? "Car Decor"}</span>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-orange-600"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          {hasWhatsApp && (
            <a
              href={buildWhatsAppUrl(shop!.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
              aria-label="Chat on WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="hidden lg:inline">WhatsApp</span>
            </a>
          )}
          {hasPhone && (
            <a
              href={`tel:${shop!.phone}`}
              className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-orange-600"
              aria-label={`Call ${shop!.phone}`}
            >
              <Phone className="h-4 w-4" />
              <span className="hidden lg:inline">{shop!.phone}</span>
            </a>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-md p-2.5 text-text-secondary hover:bg-surface-muted md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      <div
        ref={mobileMenuRef}
        id="mobile-nav"
        role="dialog"
        aria-label="Mobile navigation"
        hidden={!mobileOpen}
        className="border-t border-border-light bg-white px-4 pb-4 pt-2 md:hidden"
      >
        <nav aria-label="Mobile navigation links">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={closeMobile}
              className={({ isActive }) =>
                `block rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-orange-600 bg-orange-50"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile contact actions */}
        <div className="mt-3 border-t border-border-light pt-3 space-y-1">
          {hasWhatsApp && (
            <a
              href={buildWhatsAppUrl(shop!.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMobile}
              className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-green-600 hover:bg-green-50"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp Us
            </a>
          )}
          {hasPhone && (
            <a
              href={`tel:${shop!.phone}`}
              onClick={closeMobile}
              className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-text-secondary hover:bg-surface-muted"
            >
              <Phone className="h-4 w-4" />
              Call {shop!.phone}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
