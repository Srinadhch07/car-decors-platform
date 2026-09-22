import { useEffect } from "react";
import { Container, SectionHeading } from "../components/ui";
import { useShopSettings } from "../context/ShopSettingsContext";
import { ContactInfo } from "../features/info/ContactInfo";

export function ContactPage() {
  const { data: shop } = useShopSettings();

  useEffect(() => {
    document.title = `Contact | ${shop?.shop_name ?? "Car Decor"}`;
  }, [shop]);

  return (
    <section className="section-y">
      <Container>
        <SectionHeading
          title="Contact Us"
          subtitle="We'd love to hear from you. Get in touch with us."
          centered
        />
        <ContactInfo />
      </Container>
    </section>
  );
}