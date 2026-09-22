import { Shield, BadgeIndianRupee, Headphones } from "lucide-react";
import { Container } from "../../components/ui";

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
  return (
    <section className="bg-dark-900 py-16 sm:py-20">
      <Container>
        {/* Header */}
        <div className="mb-12 text-center">
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
