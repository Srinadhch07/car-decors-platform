import { Shield, Award, Clock, Heart } from "lucide-react";
import { useShopSettings } from "../../context/ShopSettingsContext";

const features = [
  {
    icon: Shield,
    title: "Quality Products",
    description: "We source only the best car accessories and decor items from trusted manufacturers.",
  },
  {
    icon: Award,
    title: "Expert Service",
    description: "Our experienced team helps you choose the right products for your vehicle.",
  },
  {
    icon: Clock,
    title: "Quick Installation",
    description: "Professional installation services available for all our products.",
  },
  {
    icon: Heart,
    title: "Customer First",
    description: "Your satisfaction is our priority. We're here to help before and after your purchase.",
  },
];

export function AboutSection() {
  const { data: shop } = useShopSettings();
  const name = shop?.shop_name ?? "SLG Car Decors";

  return (
    <div className="space-y-12">
      {/* Story */}
      <div className="text-center">
        <h2 className="mb-4 text-2xl font-bold text-text-primary sm:text-3xl">
          About {name}
        </h2>
        <p className="mx-auto max-w-2xl text-text-secondary">
          We are a trusted car accessories and decor shop dedicated to enhancing your driving experience.
          With a wide range of products from seat covers to floor mats, we help you personalize and protect
          your vehicle with quality you can trust.
        </p>
      </div>

      {/* Features grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feat) => (
          <div
            key={feat.title}
            className="card-surface p-6 text-center"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600/10">
              <feat.icon className="h-7 w-7 text-orange-600" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-sm font-bold text-text-primary sm:text-base">
              {feat.title}
            </h3>
            <p className="text-xs text-text-secondary sm:text-sm">
              {feat.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
