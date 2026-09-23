import { Shield, Truck, Headphones, BadgeIndianRupee } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";

const valueProps = [
  {
    icon: Shield,
    title: "Quality Focused",
    description: "Carefully selected products",
  },
  {
    icon: Truck,
    title: "Fast & Reliable",
    description: "Quick delivery to your doorstep",
  },
  {
    icon: BadgeIndianRupee,
    title: "Great Value",
    description: "Competitive pricing, real value",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description: "Here to help with your needs",
  },
];

export function ValuePropositions() {
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 32,
    stagger: 0.1,
    start: "top 90%",
  });

  return (
    <section ref={scopeRef} className="relative z-10 -mt-8 sm:-mt-10">
      <Container>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {valueProps.map((prop) => (
            <div
              key={prop.title}
              data-reveal
              className="flex items-center gap-3 rounded-lg border border-border-light border-l-2 border-l-orange-600 bg-white pl-4 pr-4 py-3 shadow-card sm:pr-5 sm:py-4"
            >
              <prop.icon className="h-8 w-8 shrink-0 text-orange-600" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-text-primary sm:text-sm">
                  {prop.title}
                </h3>
                <p className="mt-0.5 text-xs text-text-muted sm:text-sm">
                  {prop.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
