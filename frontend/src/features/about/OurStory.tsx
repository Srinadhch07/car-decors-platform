import { Container } from "../../components/ui";
import { useScrollReveal, isMobileViewport } from "../../lib/motion";
import { BUSINESS_NAME, EXPERIENCE_YEARS, LOCATION } from "./aboutContent";
import { FlowCurves, LineShards } from "./AboutDecor";

export function OurStory() {
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 20,
    stagger: 0.03,
    duration: 0.25,
    start: isMobileViewport() ? "top 90%" : "top 90%",
  });

  return (
    <section
      id="our-story"
      ref={scopeRef}
      className="section-y relative scroll-mt-24 overflow-hidden bg-surface-muted"
    >
      <FlowCurves className="inset-0 h-full w-full" />
      <LineShards className="inset-0 hidden lg:block" />

      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div data-reveal className="lg:pt-1">
            <span className="eyebrow">Our Story</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              A story shaped by
              <span className="block text-orange-600">years around cars.</span>
            </h2>
          </div>

          <div className="space-y-5 text-sm leading-relaxed text-text-secondary sm:text-base">
            <p data-reveal>
              What began as a simple interest in cars grew into a decades-long
              focus on car decor and accessories. Over {EXPERIENCE_YEARS} years,
              {" "}
              {BUSINESS_NAME} has worked on a wide range of vehicles — fitting
              accessories, guiding owners towards the right choices, and giving
              each car a personal finish.
            </p>
            <p data-reveal>
              We are based in {LOCATION}, where drivers bring us everything from
              a brand-new first car to a long-loved family vehicle. Each one
              receives the same care and the same goal: accessories that fit
              properly and make the car feel like it belongs to you.
            </p>
            <blockquote
              data-reveal
              className="border-l-2 border-orange-600 pl-5 text-base font-medium italic text-text-primary sm:text-lg"
            >
              A car should feel like yours the moment you get behind the wheel.
            </blockquote>
          </div>
        </div>
      </Container>
    </section>
  );
}
