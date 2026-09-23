import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../lib/motion";

const PORTFOLIO_URL = "https://srinadhch07.vercel.app/";
const PERSONAL_LINKEDIN_URL = "https://www.linkedin.com/in/srinadhch07/";
const THRIDHA_LINKEDIN_URL = "https://www.linkedin.com/company/thridhalabs/";

export const THRIDHA_SIGNATURE_LINKS = {
  portfolio: PORTFOLIO_URL,
  linkedin: PERSONAL_LINKEDIN_URL,
  thridha: THRIDHA_LINKEDIN_URL,
} as const;

const EXTERNAL_LINK_ATTRS = { target: "_blank", rel: "noopener noreferrer" } as const;

export interface ThridhaSignatureProps {
  /** "customer" suits the dark storefront footer; "admin" is a compact light variant. */
  variant?: "customer" | "admin";
}

/** Reveal the element once as it enters the viewport. Falls back to visible. */
function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

const baseLink =
  "relative inline-block font-medium transition-colors after:absolute after:inset-x-0 after:bottom-px after:h-px after:origin-left after:scale-x-0 after:transition-transform after:duration-300";

const customerLink = `${baseLink} text-gray-300 after:bg-orange-400 hover:text-orange-400 hover:after:scale-x-100`;
const customerName = `${baseLink} italic tracking-tight text-gray-200 after:bg-orange-400 hover:text-orange-400 hover:after:scale-x-100`;
const adminName = `${baseLink} italic tracking-tight text-dark-900 after:bg-orange-600 hover:text-orange-600 hover:after:scale-x-100`;

export function ThridhaSignature({ variant = "customer" }: ThridhaSignatureProps) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const revealed = reduced || inView;

  const isCustomer = variant === "customer";
  const motionStyle = revealed
    ? { opacity: 1, transform: "translateY(0px)" }
    : { opacity: 0, transform: "translateY(6px)" };

  return (
    <div
      ref={ref}
      className={`${
        isCustomer ? "flex flex-col items-center gap-1" : "flex flex-col items-center gap-0.5"
      } text-center transition-[opacity,transform] duration-[600ms] ease-out`}
      style={motionStyle}
    >
      <p className={isCustomer ? "text-xs text-gray-400" : "text-[11px] uppercase tracking-wider text-text-muted"}>
        A Thridha Labs creation.
      </p>
      <p className={isCustomer ? "text-sm" : "text-xs"}>
        <a href={PORTFOLIO_URL} {...EXTERNAL_LINK_ATTRS} className={isCustomer ? customerName : adminName}>
          Srinadh Chintakindi
        </a>
        <span className={isCustomer ? "text-gray-400" : "text-text-muted"}> · 2026</span>
      </p>
      {isCustomer && (
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
          <a href={PORTFOLIO_URL} {...EXTERNAL_LINK_ATTRS} className={customerLink}>
            Portfolio
          </a>
          <span aria-hidden="true" className="text-gray-600">
            ·
          </span>
          <a href={PERSONAL_LINKEDIN_URL} {...EXTERNAL_LINK_ATTRS} className={customerLink}>
            LinkedIn
          </a>
          <span aria-hidden="true" className="text-gray-600">
            ·
          </span>
          <a href={THRIDHA_LINKEDIN_URL} {...EXTERNAL_LINK_ATTRS} className={customerLink}>
            Thridha Labs
          </a>
        </p>
      )}
    </div>
  );
}