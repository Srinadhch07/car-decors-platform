import { Container } from "../../components/ui";
import { useScrollReveal, isMobileViewport } from "../../lib/motion";
import { EXPERIENCE_YEARS } from "./aboutContent";
import { FineLines } from "./AboutDecor";

const APPROACH = [
  {
    title: "Experience",
    body: `${EXPERIENCE_YEARS} years of hands-on work with car decor and accessories, on cars of every kind.`,
  },
  {
    title: "Understanding your car",
    body: "Every car and every driver is different, so recommendations start with questions rather than a sales pitch.",
  },
  {
    title: "The right accessories",
    body: "We help you choose products that fit properly and suit the way you actually use your car.",
  },
  {
    title: "A personal touch",
    body: "The goal is simple: a car that feels like yours, finished with care and attention to detail.",
  },
];

export function OurApproach() {
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 28,
    stagger: 0.1,
    start: isMobileViewport() ? "top 60%" : "top 82%",
  });

  return (
    <section ref={scopeRef} className="section-y relative overflow-hidden bg-surface">
      <FineLines className="inset-0 opacity-70" />

      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
          <div data-reveal className="lg:sticky lg:top-24 lg:self-start">
            <span className="eyebrow">Our Approach</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              How we work
              <span className="block text-orange-600">with your car.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
              Car decor is personal. Our approach keeps the car — and the person
              driving it — at the centre of every choice.
            </p>
          </div>

          <ul className="border-t border-border-light">
            {APPROACH.map((item, index) => (
              <li
                key={item.title}
                data-reveal
                className="flex gap-5 border-b border-border-light py-6"
              >
                <span className="font-mono text-sm font-semibold text-orange-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
