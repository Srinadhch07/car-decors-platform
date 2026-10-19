import { Container } from "../../components/ui";
import { TestimonialForm } from "./TestimonialForm";

export function ShareExperienceSection() {
  return (
    <section
      id="share-your-experience"
      className="section-y scroll-mt-20 bg-surface-muted"
    >
      <Container>
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Your Turn</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Had an Experience with Us?
            </h2>
            <p className="mt-3 max-w-md text-text-secondary">
              We would love to hear about your experience. Your story helps other
              drivers choose the right accessories for their cars.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Tell us what you bought and how it fit",
                "Rate your experience, if you would like",
                "Every testimonial is reviewed before it appears publicly",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <CheckMark />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-surface relative overflow-hidden">
            <div
              aria-hidden="true"
              className="h-0.5 w-full bg-gradient-to-r from-transparent via-orange-600/60 to-transparent"
            />
            <div className="p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-text-primary">
                Share Your Experience
              </h3>
              <p className="mt-1 mb-4 text-sm text-text-secondary">
                Your testimonial will be reviewed before it appears publicly.
              </p>
              <TestimonialForm />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CheckMark() {
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-600/10 text-orange-600">
      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 6.5 5 9l4.5-5.5" />
      </svg>
    </span>
  );
}

export default ShareExperienceSection;
