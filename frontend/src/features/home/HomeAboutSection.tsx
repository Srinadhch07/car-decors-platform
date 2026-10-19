import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Wrench, ArrowRight } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";
import { useShopSettings } from "../../context/ShopSettingsContext";

const highlights = [
  {
    icon: Sparkles,
    title: "Handpicked Range",
    description: "Accessories and decor chosen to help your car look and feel its best.",
  },
  {
    icon: ShieldCheck,
    title: "Quality You Can Trust",
    description: "Products selected for durability, comfort and everyday value.",
  },
  {
    icon: Wrench,
    title: "Here to Help",
    description: "Guidance to find the right fit for your vehicle and your needs.",
  },
];

export function HomeAboutSection() {
  const { data: shop } = useShopSettings();
  const name = shop?.shop_name ?? "Our shop";
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 36,
    stagger: 0.12,
    start: "top 88%",
  });

  return (
    <section ref={scopeRef} className="section-y bg-surface-muted">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative" data-reveal>
            <div className="overflow-hidden rounded-2xl shadow-card-hover">
              <img
                src="/images/showroom/about-shop.jpg"
                alt="Close-up of a modern car interior dashboard"
                width={1000}
                height={667}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-4 -right-4 -z-10 hidden h-40 w-40 rounded-2xl bg-orange-600/10 sm:block"
            />
          </div>

          <div data-reveal>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-500 sm:text-sm">
              About the Shop
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Personalise and protect your car
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
              {name} is a car accessories and decor shop dedicated to enhancing
              your driving experience. From seat covers to floor mats and
              interior upgrades, we help you personalise and protect your
              vehicle with quality you can trust.
            </p>

            <ul className="mt-8 space-y-4">
              {highlights.map((item) => (
                <li key={item.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                    <item.icon className="h-5 w-5 text-orange-600" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary sm:text-base">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              to="/about"
              className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              Learn more about us
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
