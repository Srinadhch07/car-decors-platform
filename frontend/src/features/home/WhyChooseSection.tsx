import { Shield, BadgeIndianRupee, Headphones } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal, useParallax } from "../../lib/motion";

const reasons = [
  {
    icon: Shield,
    title: "Premium Quality",
    description: "Carefully selected products that meet high standards for your vehicle.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Great Value",
    description: "Focused on practical value and competitive pricing for every budget.",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description: "Here to help with your requirements and ensure your satisfaction.",
  },
];

export function WhyChooseSection() {
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 40,
    stagger: 0.12,
    start: "top 85%",
  });
  const bgRef = useParallax<HTMLDivElement>("[data-visual]", {
    yPercent: 14,
    start: "top bottom",
    end: "bottom top",
  });

  return (
    <section ref={scopeRef} className="relative overflow-hidden bg-dark-900 py-16 sm:py-20">
      {/* Automotive visual backdrop */}
      <div ref={bgRef} className="absolute inset-y-[-12%] left-0 right-0 will-change-transform">
        <div data-visual className="h-full">
          <img
            src="/images/hero-bg.svg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-dark-900 via-dark-900/70 to-dark-900" />
        </div>
      </div>

      <Container className="relative">
        {/* Header */}
        <div className="mb-12 text-center" data-reveal>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-400 sm:text-sm">
            Why Choose Us
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Real Value for Your Ride
          </h2>
        </div>

        {/* Value blocks */}
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              data-reveal
              className="group rounded-lg border border-dark-700 bg-dark-800 p-6 text-center transition-colors hover:border-orange-600/30"
            >
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/10">
                <reason.icon
                  className="h-8 w-8 text-orange-500"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-lg font-semibold text-white">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
