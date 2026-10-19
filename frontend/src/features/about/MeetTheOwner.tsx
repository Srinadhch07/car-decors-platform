import { Container } from "../../components/ui";
import { useScrollReveal, isMobileViewport } from "../../lib/motion";
import { OWNER_NAME, BUSINESS_NAME, EXPERIENCE_YEARS, OWNER_ROLE } from "./aboutContent";

export function MeetTheOwner() {
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 20,
    stagger: 0.03,
    duration: 0.25,
    start: isMobileViewport() ? "top 90%" : "top 90%",
  });

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface">
      <Container className="relative z-10">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">The Person Behind It</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Meet {OWNER_NAME}
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-text-secondary sm:text-base">
            Anil leads {BUSINESS_NAME}, bringing {EXPERIENCE_YEARS} years of
            hands-on experience to every car that comes through the door. His
            approach is simple: understand the driver first, then recommend
            accessories that genuinely suit the car and the way it is used.
          </p>
          <span
            aria-hidden="true"
            className="mx-auto mt-7 block h-px w-16 bg-border-light"
          />
          <p className="mt-5 text-sm font-medium text-text-primary sm:text-base">
            {OWNER_NAME} · {OWNER_ROLE}
          </p>
        </div>
      </Container>
    </section>
  );
}
