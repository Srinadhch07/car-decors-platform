import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Car, Menu, Phone, Search, X } from "lucide-react";
import { useShopSettings } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
  { to: "/testimonials", label: "Testimonials" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const BRAND_TAGLINE = "Real Value Car Decors";

const WHATSAPP_ICON_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={WHATSAPP_ICON_PATH} />
    </svg>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { data: shop } = useShopSettings();
  const navigate = useNavigate();

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
  const brandName = shop?.shop_name ?? "Car Decor";

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const query = new FormData(form).get("q");
    const trimmed = typeof query === "string" ? query.trim() : "";
    if (!trimmed) return;
    closeMobile();
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border-light bg-surface">
      <div className="container-page">
        <div className="py-2 sm:py-3">
          <div className="relative overflow-hidden rounded-2xl border border-dark-700 bg-dark-950 shadow-elevated">
            {/* Decorative automotive glow, anchored to the brand seam */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(46% 120% at 30% 105%, color-mix(in srgb, var(--theme-primary) 15%, transparent), transparent 65%), radial-gradient(60% 130% at 100% 0%, color-mix(in srgb, var(--theme-foreground-inverse) 6%, transparent), transparent 55%)",
              }}
            />
            {/* Subtle car motif */}
            <Car
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1 right-4 hidden h-9 w-auto text-white/10 sm:block"
            />

            <div className="relative flex h-16 w-full items-stretch gap-1 sm:h-18 sm:gap-2 lg:h-20">
              {/* Brand — curved surface panel flowing into the dark shell */}
              <div className="relative flex min-w-0 flex-1 items-stretch self-stretch sm:flex-none sm:w-64 md:w-60 lg:w-64 xl:w-80 2xl:w-96">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 right-0 rounded-2xl bg-surface shadow-card sm:right-[-1.25rem] sm:rounded-r-[3rem]"
                />
                {/* Integrated orange sweep at the light/dark seam (desktop only) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -right-6 hidden w-16 rounded-full bg-orange-500/30 blur-xl sm:block"
                />
                <Link
                  to="/"
                  aria-label={`${brandName} — Home`}
                  className="relative z-10 flex h-full w-full items-center gap-2 rounded-2xl pl-2.5 pr-2.5 transition-colors hover:bg-orange-50/40 sm:gap-3 sm:rounded-r-[3rem] sm:pl-5 sm:pr-9 lg:pl-6 lg:pr-10"
                >
                  {shop?.logo_url ? (
                    <img
                      src={shop.logo_url}
                      alt=""
                      className="h-7 w-auto shrink-0 sm:h-8"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 sm:h-10 sm:w-10">
                      <Car className="h-5 w-5 text-orange-600 sm:h-6 sm:w-6" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col justify-center leading-tight">
                    <span className="line-clamp-2 text-base font-bold tracking-tight text-text-primary sm:text-lg">
                      {brandName}
                    </span>
                    <span className="hidden truncate text-[11px] font-medium tracking-wide text-orange-600 lg:block lg:text-xs">
                      {BRAND_TAGLINE}
                    </span>
                  </span>
                </Link>
              </div>

              {/* Desktop / tablet navigation pill */}
              <nav
                aria-label="Main navigation"
                className="hidden min-w-0 flex-1 items-center justify-center md:flex"
              >
                <div className="flex items-center gap-1 rounded-full bg-white p-1 shadow-card">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === "/"}
                      className={({ isActive }) =>
                        `whitespace-nowrap rounded-full px-2 py-1.5 text-sm font-medium transition-colors xl:px-3 ${
                          isActive
                            ? "bg-orange-50 font-semibold text-orange-600"
                            : "text-text-secondary hover:bg-orange-50/70 hover:text-orange-600"
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </nav>

              {/* Desktop / tablet actions */}
              <div className="flex shrink-0 items-center gap-2 self-center sm:gap-2 sm:pl-3 sm:pr-3 lg:gap-3 lg:pl-6 lg:pr-5">
                <form
                  role="search"
                  aria-label="Search products"
                  onSubmit={handleSearch}
                  className="hidden h-9 items-center overflow-hidden rounded-full border border-dark-600 bg-dark-800 lg:flex"
                >
                  <input
                    name="q"
                    type="search"
                    placeholder="Search accessories..."
                    aria-label="Search accessories"
                    className="w-24 bg-transparent py-2 pl-4 text-sm text-text-inverse placeholder:text-text-muted focus:outline-none xl:w-36 2xl:w-44"
                  />
                  <button
                    type="submit"
                    className="m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white transition-colors hover:bg-orange-700 active:scale-90"
                    aria-label="Search"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </form>

                {hasWhatsApp && (
                  <a
                    href={buildWhatsAppUrl(shop!.whatsapp_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white transition-colors hover:bg-green-700 active:scale-90 lg:h-9 lg:w-9"
                    aria-label="Chat on WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </a>
                )}
                {hasPhone && (
                  <a
                    href={`tel:${shop!.phone}`}
                    aria-label={`Call ${shop!.phone}`}
                    className="hidden h-9 items-center gap-1.5 text-sm font-medium text-text-inverse/80 transition-colors hover:text-orange-400 lg:flex"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="hidden 2xl:inline">{shop!.phone}</span>
                  </a>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-dark-600 bg-dark-800 text-white transition-colors hover:border-orange-500 hover:text-orange-400 active:scale-90 md:hidden lg:h-9 lg:w-9"
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
              className="border-t border-dark-700 bg-white px-4 pb-4 pt-3 md:hidden"
            >
              <form
                role="search"
                aria-label="Search products"
                onSubmit={handleSearch}
                className="mb-3 flex items-center gap-2 rounded-xl border border-border-light bg-white px-2 py-1.5 shadow-sm"
              >
                <Search className="h-4 w-4 shrink-0 text-text-muted" />
                <input
                  name="q"
                  type="search"
                  placeholder="Search accessories..."
                  aria-label="Search accessories"
                  className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white transition-colors hover:bg-orange-700"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>
              </form>

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
                          ? "bg-orange-50 text-orange-600"
                          : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              {/* Mobile contact actions */}
              <div className="mt-3 space-y-1 border-t border-border-light pt-3">
                {hasWhatsApp && (
                  <a
                    href={buildWhatsAppUrl(shop!.whatsapp_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobile}
                    className="flex items-center gap-2 rounded-md px-3 py-3 text-sm font-medium text-green-600 hover:bg-green-50"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
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
          </div>
        </div>
      </div>
    </header>
  );
}