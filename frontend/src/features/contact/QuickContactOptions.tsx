import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { useShopSettings, hasContent } from "../../context/ShopSettingsContext";
import { buildWhatsAppUrl } from "../../lib/utils/whatsapp";
import { buildDirectionsUrl } from "./enquiry";
import { OptionAccents, OptionIconRings } from "./ContactDecor";

interface ContactOption {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  actionLabel: string;
  external: boolean;
}

/** Section B — the fastest ways to reach the shop, only for configured channels. */
export function QuickContactOptions() {
  const { data: shop } = useShopSettings();
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 30,
    stagger: 0.1,
    start: "top 84%",
  });

  const options: ContactOption[] = [];

  if (hasContent(shop?.phone)) {
    options.push({
      key: "call",
      title: "Call Us",
      description: shop!.phone,
      icon: Phone,
      href: `tel:${shop!.phone}`,
      actionLabel: "Call Now",
      external: false,
    });
  }

  if (hasContent(shop?.whatsapp_number)) {
    options.push({
      key: "whatsapp",
      title: "WhatsApp",
      description: "Message us for quick answers and product availability.",
      icon: MessageCircle,
      href: buildWhatsAppUrl(shop!.whatsapp_number),
      actionLabel: "Start Chat",
      external: true,
    });
  }

  if (hasContent(shop?.email)) {
    options.push({
      key: "email",
      title: "Email",
      description: shop!.email as string,
      icon: Mail,
      href: `mailto:${shop!.email}`,
      actionLabel: "Send Email",
      external: false,
    });
  }

  if (hasContent(shop?.address)) {
    options.push({
      key: "visit",
      title: "Visit Store",
      description: shop!.address,
      icon: MapPin,
      href: buildDirectionsUrl(shop!.address),
      actionLabel: "Get Directions",
      external: true,
    });
  }

  if (options.length === 0) return null;

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface-muted">
      <OptionAccents className="inset-0 hidden lg:block" />

      <Container className="relative z-10">
        <div data-reveal className="mx-auto mb-10 max-w-2xl text-center">
          <span className="eyebrow">Quick Contact</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Reach Us the Way You Prefer
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
            Call, message or visit — pick whatever is easiest for you.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {options.map((option) => (
            <ContactOptionCard key={option.key} option={option} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function ContactOptionCard({ option }: { option: ContactOption }) {
  const Icon = option.icon;

  return (
    <a
      data-reveal
      href={option.href}
      {...(option.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="card-surface group relative flex h-full flex-col overflow-hidden p-6 transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-elevated"
    >
      <span className="relative mb-5 inline-grid h-14 w-14 place-items-center">
        <OptionIconRings className="inset-0 h-14 w-14 text-orange-500/40" />
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-600/10 text-orange-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </span>

      <h3 className="text-base font-semibold text-text-primary">{option.title}</h3>
      <p className="mt-1.5 flex-1 break-words text-sm leading-relaxed text-text-secondary">
        {option.description}
      </p>

      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 transition-colors group-hover:text-orange-700">
        {option.actionLabel}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </a>
  );
}
