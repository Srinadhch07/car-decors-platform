import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import { api } from "../../lib/api/client";
import type { GalleryItem } from "../../types/api";
import { Container, SectionHeading } from "../../components/ui";
import { useScrollReveal } from "../../lib/motion";

const MAX_SHOWCASE_ITEMS = 6;

export function ShowcaseSection() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const scopeRef = useScrollReveal("[data-reveal]", {
    y: 36,
    stagger: 0.08,
    start: "top 88%",
  });

  useEffect(() => {
    let cancelled = false;
    api
      .getFeaturedGallery({ page_size: MAX_SHOWCASE_ITEMS })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section ref={scopeRef} className="section-y bg-surface">
      <Container>
        <SectionHeading
          title="Our Work"
          subtitle="A look at the interiors, finishes and detailing that keep cars looking their best."
          eyebrow="Showcase"
          centered
          action={
            <Link
              to="/gallery"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              View All Our Work
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} data-reveal>
              <Link
                to="/gallery"
                aria-label={`View ${item.title} in Our Work`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-xl border border-border-light bg-dark-900 shadow-card"
              >
                {item.media_type === "video" ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-dark-950/80 via-dark-950/10 to-transparent" />
                {item.media_type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-orange-600 shadow-elevated">
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    </span>
                  </span>
                )}
                <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white">
                  {item.title}
                </span>
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange-600 transition-all duration-300 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export default ShowcaseSection;
