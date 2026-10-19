# Homepage Redesign — Completion Report

Premium "showroom + modern automotive retail" redesign of the public homepage,
built entirely on existing platform capabilities. No backend, database, or
admin-panel behaviour was changed.

## 1. Objective

Redesign the storefront homepage into a premium, image-led showroom experience
using only:

- Existing backend APIs (categories, products, featured testimonials, shop settings).
- Admin-managed shop data and the admin-controlled colour theme.
- Static, honest marketing copy (no fabricated facts).

## 2. Constraints honoured

- **Theme preserved.** No new theme provider, no preset renames, no hardcoded
  `#363199`. All colour styling goes through the existing themeable utilities
  (`bg-orange-600`, `text-orange-500`, `bg-dark-900`, `text-text-primary`, …)
  which resolve to the runtime `--theme-*` variables, so the whole homepage
  re-themes when an admin saves a theme. New styling uses theme tokens plus
  `color-mix(... var(--theme-primary) ...)` accents.
- **No product search on the homepage.** The hero no longer renders `HeroSearch`.
  (`HeroSearch` is retained and still covered by unit tests; the Header search is
  untouched.)
- **No fake data.** No invented brands, ratings, review counts, discounts,
  addresses, hours, "years of experience", awards, or statistics.
- **No Gallery admin feature.** Showcase content lives in an isolated frontend
  data module (see §6) so a future admin-managed gallery can replace it.
- **No backend / DB / admin / storage / moderation changes.**
- **No commits / pushes.**

## 3. Homepage section order

Rendered by `frontend/src/pages/HomePage.tsx` in the required order:

| # | Section | Component | Data source |
|---|---------|-----------|-------------|
| 1 | Header / Nav (shared) | `components/layout/Header.tsx` | shop settings |
| 2 | Showroom Hero | `features/home/ShowroomHero.tsx` (new) | static copy + local image |
| — | Value trust strip | `features/home/ValuePropositions.tsx` | static |
| 3 | Shop by Category | `features/home/CategorySection.tsx` | `GET /api/categories` (`is_active`) |
| 4 | Featured Products | `features/home/FeaturedProducts.tsx` | `GET /api/products` (`is_active`) |
| 5 | About the Shop | `features/home/HomeAboutSection.tsx` (new) | shop settings + static |
| 6 | Our Work / Showcase | `features/home/ShowcaseSection.tsx` (new) | isolated local gallery data |
| 7 | Why Choose Us? | `features/home/WhyChooseSection.tsx` | static |
| 8 | Brands We Carry | — omitted (see §7) | — |
| 9 | Customer Testimonials | `features/home/FeaturedTestimonials.tsx` | `GET /api/testimonials/featured` |
| 10 | Visit / Contact Us | `features/home/VisitUsSection.tsx` (new) | shop settings |
| 11 | Footer (shared) | `components/layout/Footer.tsx` | shop settings |

Hero copy:
- Heading: **"Make Every Drive Feel Special."**
- Support: "Explore car accessories and discover ways to personalise your driving experience."
- Primary CTA: **Explore Products → `/products`**.
- Secondary CTA: **Contact Us** → `/contact`.

`ValuePropositions` is kept as a compact trust strip directly beneath the hero
(same visual band) rather than a standalone section, preserving the mandated
order of the top-level sections.

## 4. Hero & section content sources

- Hero image: local, bundled at `frontend/public/images/showroom/hero-showroom.jpg`.
- About the Shop: uses the admin-managed `shop_name`; body copy is the existing
  truthful About copy (no invented facts). Image bundled locally.
- Visit / Contact Us: address, business hours, phone, WhatsApp and email read
  from shop settings. A "Get directions" link is generated only when an address
  is configured (no embedded third-party map, to protect performance/privacy).
  The section returns nothing when no contact information exists.
- Featured Testimonials: reuses `GET /api/testimonials/featured`, which the
  backend restricts to **approved ∧ published ∧ consenting** testimonials.

## 5. Omitted section — "Brands We Carry"

There is **no brand data source** anywhere in the platform (no brand model,
field, API, or admin screen). Fabricating a brand list would violate the
"no fake data" rule, so the section is intentionally omitted. See §7 for the
future data source that would enable it.

## 6. Image assets (illustrative, royalty-free)

All photos are royalty-free **Pexels** images used under the
[Pexels License](https://www.pexels.com/license/) (free for commercial use, no
attribution required — credited here as good practice). They are **illustrative
only and do not depict the shop's real work**; the showcase section states this
in the UI.

| Local file | Pexels photo | Title | Author |
|------------|--------------|-------|--------|
| `hero-showroom.jpg` | [20051474](https://www.pexels.com/photo/20051474/) | Modern Car Salon | WAVYVISUALS |
| `about-shop.jpg` | [7290400](https://www.pexels.com/photo/7290400/) | Car Interior Dashboard | Mike Bird |
| `showcase-1.jpg` | [36838029](https://www.pexels.com/photo/36838029/) | Luxurious Car Interior with Red Leather Seats | Critical Smith |
| `showcase-2.jpg` | [36841136](https://www.pexels.com/photo/36841136/) | Luxury Car Interior with Modern Dashboard | Critical Smith |
| `showcase-3.jpg` | [20042054](https://www.pexels.com/photo/20042054/) | A Man Polishing a Car | WAVYVISUALS |
| `showcase-3.jpg` | [20051463](https://www.pexels.com/photo/20051463/) | Men Holding and Spraying Foil near Cars | WAVYVISUALS |
| `showcase-5.jpg` | [9139591](https://www.pexels.com/photo/9139591/) | Sports Cars Parked Inside a Garage | Dennis Truong |
| `showcase-6.jpg` | [4756887](https://www.pexels.com/photo/4756887/) | Cars in Car Repair Shop | Jae Park |

(Note: `showcase-4.jpg` corresponds to Pexels photo 20051463 in the table above.)

Showcase gallery content is defined in
`frontend/src/features/home/showcaseData.ts` — an isolated, typed data structure
(`src`, `alt`, `label`, `author`, `sourceUrl`) that a future admin-managed
Gallery feature can replace without touching the section component.

## 7. Future admin-content opportunities

These would let the new sections become admin-managed (each requires backend +
admin work, deliberately out of scope here):

1. **Gallery / Our Work** — a media collection model + admin CRUD, replacing
   `showcaseData.ts`.
2. **Brands We Carry** — a brands model + admin CRUD, enabling the omitted section.
3. **About the Shop** — an editable "about" rich-text/short-text field in shop
   settings, replacing the static paragraph.
4. **Hero content** — editable hero headline/subtext/CTAs/image in shop settings.
5. **Business hours structure** — per-day hours to render a richer schedule.

## 8. Files changed / added

Changed:
- `frontend/src/pages/HomePage.tsx` — new section order.
- `frontend/src/features/home/index.ts` — export new sections.
- `frontend/src/components/layout/Footer.tsx` — render all configured social
  networks (Telegram/Website included; WhatsApp de-duplicated; unknown networks
  fall back to a generic icon + humanised label).
- `frontend/src/components/layout/Footer.test.tsx` — cover the social fix.
- `frontend/src/features/home/HomePage.test.tsx` — section-order + omissions tests.

Added:
- `frontend/src/features/home/ShowroomHero.tsx` (+ `.test.tsx`)
- `frontend/src/features/home/HomeAboutSection.tsx` (+ `.test.tsx`)
- `frontend/src/features/home/ShowcaseSection.tsx` (+ `.test.tsx`)
- `frontend/src/features/home/VisitUsSection.tsx` (+ `.test.tsx`)
- `frontend/src/features/home/showcaseData.ts`
- `frontend/public/images/showroom/` (8 bundled JPEGs)

## 9. Verification results

Run from `frontend/`:

| Command | Result |
|---------|--------|
| `npm run lint` (oxlint) | Clean — no errors/warnings |
| `npx tsc -b` | Clean |
| `npm run build` (`tsc -b && vite build`) | Success (1998 modules; pre-existing 500 kB chunk-size advisory) |
| `npm run test` (vitest) | **415 passing, 1 failing** |

The single failure is the **pre-existing, unrelated** test
`frontend/src/features/admin/products/ProductForm.test.tsx:205`
("sends an image file when one is selected") — a jsdom/FormData/Blob compat
issue in the test environment. It was not touched, skipped, or weakened.

Note: on one full parallel run a second file
(`ShopSettingsAdminPage.test.tsx`) failed under load but **passes in isolation
and alongside `ProductForm.test.tsx`**, confirming it is a pre-existing flake,
not a regression from this change.

## 10. Responsive / accessibility / performance notes

- **Responsive.** Layouts use the project's breakpoints (hero `min-h-[68vh]` →
  `lg:min-h-[80vh]`; showcase grid `grid-cols-2` → `lg:grid-cols-3`; Visit split
  `lg:grid-cols-2`), consistent with the existing design system across the
  1440/1024/768/390/320 breakpoints.
- **Accessibility.** Exactly one `h1` (hero); sections use `h2`; cards/items use
  `h3`. Decorative media uses `alt=""`/`aria-hidden`; content images have
  descriptive `alt`. Focus, reduced-motion, and contrast are handled by the
  existing global styles (reduced-motion is honoured for both CSS and GSAP motion).
- **Performance.** Only the hero image is eager (`fetchPriority="high"`); all
  other images are lazy-loaded. Hero and About images carry explicit
  `width`/`height`; showcase tiles use fixed aspect ratios — minimising layout
  shift. No new dependencies were added.

Note: this agent cannot render images/screenshots, so responsive and visual QA
above is based on code review and automated tests. A manual visual pass across
the listed breakpoints is recommended before release.

## 10b. Theme verification

The homepage uses only themeable utility classes and `--theme-*` variables. It
was reviewed against the default theme and the alternate presets (e.g.
`racing-red`, `electric-blue`, `luxury-gold`); all colours derive from the
runtime variables applied by `ShopSettingsProvider`, so switching themes needs
no component changes.

## 11. Confirmations

- No backend, database, storage, moderation, or admin-panel code was changed.
- The admin theme system (provider, presets, variables, persistence) is intact.
- "Brands We Carry" was intentionally omitted (no data source) and documented.
- No Gallery admin feature was added; showcase content is isolated frontend data.
- No commits or pushes were made; uncommitted work (including the pre-existing
  `ADMIN_PANEL_FEATURE_AUDIT.md`) was left untouched.
