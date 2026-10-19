import { useShopSettings } from "../context/ShopSettingsContext";
import { SeoHead } from "../components/seo";
import { DEFAULT_OG_IMAGE, type SeoData } from "../lib/seo";
import {
  AboutHero,
  ClosingCta,
  ExperienceHighlight,
  ExploreOfferings,
  MeetTheOwner,
  OurApproach,
  OurStory,
  VisitStore,
} from "../features/about";
import {
  BUSINESS_NAME,
  EXPERIENCE_YEARS,
  LOCATION,
} from "../features/about/aboutContent";

export function AboutPage() {
  const { data: shop } = useShopSettings();
  const brand = shop?.shop_name?.trim() || BUSINESS_NAME;

  const seo: SeoData = {
    title: `About | ${brand}`,
    description: `Learn about ${brand} — ${EXPERIENCE_YEARS} years of car accessories and car decor experience in ${LOCATION}.`,
    canonicalPath: "/about",
    siteName: brand,
    ogImage: DEFAULT_OG_IMAGE,
  };

  return (
    <div>
      <SeoHead data={seo} />
      <AboutHero />
      <ExperienceHighlight />
      <OurStory />
      <MeetTheOwner />
      <ExploreOfferings />
      <OurApproach />
      <VisitStore />
      <ClosingCta />
    </div>
  );
}
