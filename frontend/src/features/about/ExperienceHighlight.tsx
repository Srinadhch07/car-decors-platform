import { Container } from "../../components/ui";
import { useScrollReveal, isMobileViewport } from "../../lib/motion";
import { EXPERIENCE_YEARS } from "./aboutContent";
import { OrbitRings, TimelineFlow } from "./AboutDecor";

/** B. The 17-year milestone, told with a single overwhelming numeral. */
export function ExperienceHighlight() {
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 20,
    stagger: 0.03,
    duration: 0.25,
    start: isMobileViewport() ? "top 90%" : "top 90%",
  });

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface">
      <OrbitRings className="top-1/2 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 opacity-70 sm:h-[28rem] sm:w-[28rem]" />

      <Container className="relative z-10">
        <div data-reveal className="flex flex-col items-center text-center">
          <span className="eyebrow mb-6">Experience</span>

          <span className="block text-[clamp(5rem,16vw,11rem)] font-black leading-[0.85] tracking-tight text-orange-600">
            {EXPERIENCE_YEARS}
          </span>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Years of Experience
          </h2>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Almost two decades spent inside the world of car decor and
            accessories — learning what fits, what lasts and what genuinely
            improves the way a car feels to drive.
          </p>
        </div>

        <TimelineFlow className="mx-auto mt-14 h-10 w-full max-w-3xl" />
      </Container>
    </section>
  );
}
