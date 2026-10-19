import { ArrowRight, Globe } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { SectionDivider } from "./ContactDecor";

/**
 * Brand glyph paths mirror the Footer icons so social marks stay identical
 * across the site. The installed lucide-react build does not export brand
 * logos, so simple inline SVG paths are used for those and lucide for
 * generic/website fallbacks.
 */
const SOCIAL_META: Record<string, { label: string; path?: string }> = {
  instagram: {
    label: "Instagram",
    path: "M12 2.163c3.259 0 3.668.014 4.948.072 4.358.2 6.78 2.618 6.98 6.98.059 1.281.073 1.689.073 4.948 0 3.259-.014 3.667-.072 4.947-.2 4.358-2.618 6.78-6.98 6.98-1.281.058-1.689.072-4.948.072-3.259 0-3.668-.014-4.948-.072-4.358-.2-6.78-2.618-6.98-6.98-.059-1.281-.073-1.689-.073-4.948 0-3.258.014-3.667.072-4.947.2-4.358 2.618-6.78 6.98-6.98C8.332 2.177 8.741 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  },
  facebook: {
    label: "Facebook",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  youtube: {
    label: "YouTube",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  twitter: {
    label: "Twitter / X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  linkedin: {
    label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  telegram: {
    label: "Telegram",
    path: "M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z",
  },
  whatsapp: {
    label: "WhatsApp",
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  },
};

function SocialIcon({ d, className }: { d?: string; className?: string }) {
  if (!d) {
    return <Globe className={className} aria-hidden="true" />;
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Section E — the configured social connections. */
export function SocialConnections() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", { y: 26, stagger: 0.08, start: "top 86%" });

  const entries = Object.entries(shop?.social_links ?? {}).filter(
    ([, url]) => hasContent(url) && /^https?:\/\//i.test(url.trim()),
  );

  if (entries.length === 0) return null;

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface">
      <SectionDivider className="inset-x-0 top-0 h-6 w-full opacity-60" />

      <Container className="relative z-10">
        <div data-reveal className="mx-auto mb-10 max-w-2xl text-center">
          <span className="eyebrow">Connect</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Stay Connected
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
            Follow along for new arrivals, offers and helpful tips.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([platform, url]) => {
            const meta = SOCIAL_META[platform];
            const label =
              meta?.label ?? platform.charAt(0).toUpperCase() + platform.slice(1);
            const href = url.trim();
            return (
              <a
                key={platform}
                data-reveal
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${label} (opens in a new tab)`}
                className="card-surface group flex items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-500/40 hover:shadow-elevated"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-600/10 text-orange-600">
                  <SocialIcon d={meta?.path} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text-primary">{label}</span>
                  <span className="block truncate text-xs text-text-muted">{href}</span>
                </span>
                <ArrowRight
                  className="ml-auto h-4 w-4 shrink-0 text-text-muted transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-orange-600"
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
