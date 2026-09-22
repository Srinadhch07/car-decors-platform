import { useEffect } from "react";
import {
  HeroSection,
  ValuePropositions,
  CategorySection,
  FeaturedProducts,
  WhyChooseSection,
  ContactCTA,
} from "../features/home";

export function HomePage() {
  useEffect(() => {
    document.title = "Home | Premium Car Decors";
  }, []);

  return (
    <div>
      <HeroSection />
      <ValuePropositions />
      <CategorySection />
      <FeaturedProducts />
      <WhyChooseSection />
      <ContactCTA />
    </div>
  );
}
