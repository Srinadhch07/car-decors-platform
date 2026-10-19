import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Container } from "../../components/ui";
import { useScrollReveal, isMobileViewport } from "../../lib/motion";
import { LightSweep } from "./AboutDecor";

export function ClosingCta() {
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 26,
    start: isMobileViewport() ? "top 65%" : "top 88%",
  });

  return (
    <section
      ref={scopeRef}
      className="relative overflow-hidden bg-dark-900 py-20 text-white sm:py-24"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950"
      />
      <LightSweep className="inset-0" />

      <Container className="relative z-10">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to give your car a personal touch?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-gray-300 sm:text-base">
            Explore our collection or get in touch — we are happy to help you
            find the right accessories for your car.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-orange-700 active:bg-orange-800 sm:text-base"
            >
              Explore Products
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
