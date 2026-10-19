# Contact Page Redesign Report

Project: Venkata Ramana Real Value Car Decors (this checkout uses the
admin-configurable shop name; reports refer to it generically as "the shop").
Feature: premium, responsive redesign of the public **Contact** page
with subtle 2D animations.

Status: **complete, verified, left uncommitted** (no commits were made).

---

## 1. Summary

The public `/contact` route was rebuilt as a purpose-built, six-section contact
experience that reuses the existing design language, theme tokens, motion hooks
and layout (shared Header/Footer). Every visitor-facing contact channel is
driven by admin-managed shop settings; nothing configurable is hardcoded.

Because this project has **no backend enquiry endpoint**, the "contact form" is
implemented honestly as an **enquiry composer**: it validates input, composes a
readable message, and hands it off to a real configured channel (WhatsApp deep
link or the visitor's email client). It never pretends a message was delivered,
and no backend/DB/API/route was added or changed.

## 2. Final page structure

`frontend/src/pages/ContactPage.tsx` composes these sections (Header/Footer come
from the shared `Layout`):

1. **Contact hero** — `ContactHero` (H1 "Let's Talk About / Your Next Drive.",
   support copy, "Send an Enquiry" → `#enquiry`, "WhatsApp Us" when configured).
2. **Quick contact options** — `QuickContactOptions` (Call / WhatsApp / Email /
   Visit Store cards, each rendered only when configured).
3. **Contact / enquiry form** — `EnquiryComposer` (validated fields, honest
   WhatsApp/email handoff; call-only fallback when no text channel exists).
4. **Store location & directions** — `StoreLocation` ("Visit Us in Karimnagar",
   address, hours, phone, email, directions link, decorative map panel).
5. **Social connections** — `SocialConnections` (only configured, valid URLs).
6. **Closing CTA** — `ClosingCta` ("Your Next Upgrade Starts Here.",
   "Explore Products" + WhatsApp/Call).
7. **Existing footer** — reused automatically via `Layout` (not re-rendered by
   the page).

## 3. Files

Added (`frontend/src/features/contact/`):

- `contactContent.ts` — copy, field limits, optional enquiry subjects.
- `enquiry.ts` — pure helpers: `isValidContact`, `buildEnquiryText`,
  `buildWhatsAppEnquiryUrl`, `buildMailtoEnquiryUrl`, `buildDirectionsUrl`.
- `ContactDecor.tsx` — 11 decorative pieces (see §7).
- `ContactHero.tsx`, `QuickContactOptions.tsx`, `EnquiryComposer.tsx`,
  `StoreLocation.tsx`, `SocialConnections.tsx`, `ClosingCta.tsx`, `index.ts`.
- Tests: `ContactHero.test.tsx`, `QuickContactOptions.test.tsx`,
  `EnquiryComposer.test.tsx`, `StoreLocation.test.tsx`,
  `SocialConnections.test.tsx`, `ClosingCta.test.tsx`, `ContactDecor.test.tsx`,
  `enquiry.test.ts`.

Modified:

- `frontend/src/pages/ContactPage.tsx` — rewritten to compose the sections;
  keeps `SeoHead` + LocalBusiness JSON-LD; description updated to Karimnagar.
- `frontend/src/styles/index.css` — added the `.contact-*` decorative CSS
  family (reusing shared keyframes) plus `.field-error`; extended the
  `prefers-reduced-motion` block to neutralise every `.contact-*` animation.
- `frontend/src/pages/InfoPages.test.tsx` — updated the ContactPage assertions
  for the new content (hero heading, channels, composer, closing CTA).

## 4. Data & configuration reused (no new endpoints)

- `useShopSettings()` / `hasContent()`: `shop_name`, `logo_url`, `phone`,
  `whatsapp_number`, `email`, `address`, `business_hours`, `social_links`.
- `buildWhatsAppUrl` (existing util) for short pre-filled WhatsApp CTA links.
- `enquiry.ts` composes custom-message `wa.me` / `mailto:` links locally.
- Directions links use the same `https://www.google.com/maps/search/?api=1&query=…`
  pattern already used by `VisitUsSection`/`VisitStore`.
- No new API client methods; no backend files touched.

## 4a. Honest submission behaviour (limitation)

There is no `POST /api/...` enquiry route in this project (backend routes are
auth, catalog, health, products, seo, shop, testimonials). The composer therefore:

- validates name, contact (phone **or** email), optional subject and message,
  with inline, `role="alert"` errors and focus moved to the first invalid field;
- composes a plain-text enquiry (`Name/Contact/Subject/Message`, greeting with
  the shop name) and opens a real destination:
  - **Send on WhatsApp** → `https://wa.me/<number>?text=<message>` (new tab);
  - **Send via Email** → `mailto:<email>?subject=…&body=<message>`;
- prevents accidental duplicate submission by disabling the action buttons while
  a handoff is in progress (short cooldown);
- shows an **honest status** (`role="status"`): "Opening WhatsApp…" then
  "…press Send there to reach us" — never "message sent";
- degrades gracefully: if WhatsApp and email are both unset but a phone is
  configured, it shows a "Call Us to Enquire" panel; if no channel exists at all
  it renders nothing (the whole section is skipped).

## 5. Animation system

JS motion uses the existing `lib/motion` hooks (`useScrollReveal`,
`useHeroAnimation`), all gated by `canAnimate()` (disabled under reduced motion
and in tests/jsdom). Purely decorative motion is CSS-only via a new `.contact-*`
family that reuses the shared `about-*` keyframes plus two small additions
(`contact-soft-pulse`, `contact-gradient-move`).

## 5a. Twelve 2D animation placements

1. Hero contour lines — `HeroContours` (`.contact-dash`).
2. Hero drifting particles — `HeroParticles` (`.contact-float`).
3. Hero route line motif at the base — `HeroLineMotif` (`.contact-dash` + `.contact-pulse`).
4. Quick-contact icon rings — `OptionIconRings` (`.contact-spin` / `.contact-spin-rev`).
5. Quick-contact floating accents — `OptionAccents` (`.contact-float`).
6. Enquiry drifting radial gradient — `EnquiryGradient` (`.contact-gradient`).
7. Enquiry fine-line pulse — `EnquiryFineLines` (`.contact-pulse` + `.contact-lines`).
8. Form interaction motion — focus ring, button hover/active/disabled, arrow
   nudge (CSS transitions; no decorative asset).
9. Store rotating rings — `LocationRings` (`.contact-spin` / `.contact-spin-rev`).
10. Store route line travel — `RouteLines` (`.contact-route` + a pulsing node).
11. Section divider line movement — `SectionDivider` (`.contact-dash-slow`).
12. Closing CTA light sweep — `LightSweep` (`.contact-sweep`).

Scroll-reveal (`useScrollReveal` / `data-reveal`) is layered on top across the
sections. All decorations are `aria-hidden="true"` and `pointer-events:none`.

## 5b. Reduced motion

The `@media (prefers-reduced-motion: reduce)` block sets
`animation: none !important; transform: none !important` for every `.contact-*`
class, so the static linework remains but nothing moves. JS motion is already
disabled in that mode via `canAnimate()`.

## 5c. Theme compliance

All colours derive from theme tokens/utilities (`orange-*` → `--theme-primary*`,
`surface*`, `text-text-*`, `border-border*`, `dark-*`, `color-mix(... var(--theme-primary) ...)`).
No brand hex is hardcoded. The only literal colour is `#dc2626` for the
**invalid-field state**, which is a semantic error colour intentionally
independent of the theme.

## 6. Responsive & accessibility

- Responsive grids: 1 → 2 → 4 columns for quick options; stacked → 2-column
  enquiry and store layouts; fluid hero type via `clamp()`.
- Semantic landmarks/headings; single `<h1>` in the hero; labelled form
  controls (`field-label`), `aria-invalid` + `aria-describedby` on invalid
  fields, `role="alert"` errors, `role="status" aria-live="polite"` handoff
  status; `value/maxLength` guards on inputs.
- External links use `target="_blank" rel="noopener noreferrer"` and explicit
  accessible names; decorative SVGs are `aria-hidden`.
- No `dangerouslySetInnerHTML`.

## 7. SEO

`ContactPage` keeps `SeoHead` and the `LocalBusiness` JSON-LD (name, url,
description, telephone, email, address, `sameAs`) sourced from settings. The meta
description was updated to "…visit our shop in Karimnagar, Telangana."

## 8. Tests added

- `enquiry.test.ts` — contact validation, message composition, deep-link builders.
- `EnquiryComposer.test.tsx` — renders fields/buttons; empty-form errors block the
  handoff; invalid contact rejected; WhatsApp handoff composes the message and
  shows the honest status; buttons disabled while opening; call fallback; renders
  nothing without any channel.
- `QuickContactOptions.test.tsx` — per-channel cards, `tel:`/`wa.me`/maps links,
  conditional rendering, empty case.
- `StoreLocation.test.tsx` — Karimnagar heading/details, links, empty case.
- `SocialConnections.test.tsx` — configured links, invalid-URL filtering, empty case.
- `ContactHero.test.tsx` — heading/copy, `#enquiry` + WhatsApp CTAs, conditional CTA.
- `ClosingCta.test.tsx` — heading, product CTA, WhatsApp/Call preference.
- `ContactDecor.test.tsx` — all 11 pieces render `aria-hidden`.

Updated: `pages/InfoPages.test.tsx` ContactPage assertions.

## 9. Verification (exact results)

- `npx tsc -b` → **pass** (exit 0).
- `npm run lint` (oxlint) → **pass** (exit 0).
- `npm run build` → **pass**, `✓ built` (exit 0); only the pre-existing
  >500 kB chunk-size warning.
- `npx vitest run src/features/contact src/pages/InfoPages.test.tsx` →
  **9 files, 44 tests, 44 passed**.
- `npx vitest run` (full suite) → **66 files, 513 tests, 512 passed, 1 failed**.
  The single failure is the **pre-existing** `ProductForm > sends an image file`
  jsdom `File`/`FormData` issue (`src/features/admin/products/ProductForm.test.tsx`);
  it is unrelated to this change. The previously observed
  `ShopSettingsAdminPage` parallel-load flake passed on this run.

## 10. Known pre-existing issues (not introduced here)

- `frontend/src/features/admin/products/ProductForm.test.tsx` image-upload test.
- `frontend/src/pages/admin/shop/ShopSettingsAdminPage.test.tsx` parallel-load flake.

## 11. Assumptions, decisions & limitations

- **Karimnagar** is used in the page narrative/headings per the brief, while the
  admin-configured `shop.address` is rendered verbatim (an earlier SEO string
  referenced Hanamkonda; the Contact page copy now uses Karimnagar).
- The enquiry form cannot persist to the server; it hands off to WhatsApp/email.
  This is the honest "existing supported contact method" alternative required
  when no backend submission route exists.
- `features/info/ContactInfo.tsx` (and its test) is retained but no longer used by
  `ContactPage`; it remains exported from `features/info`.
- Brand social glyphs use the same inline SVG paths as the Footer because the
  installed `lucide-react` build does not export brand logos.
- No 3D assets and no external image/font assets were introduced.

## 12. Preservation

No commits or pushes were made. The existing reports
(`HOMEPAGE_REDESIGN_REPORT.md`, `PRODUCTS_PAGE_REDESIGN_REPORT.md`,
`TESTIMONIALS_PAGE_REDESIGN_REPORT.md`, `ABOUT_PAGE_REDESIGN_REPORT.md`) and
`ADMIN_PANEL_FEATURE_AUDIT.md` are untouched. All prior uncommitted work is intact;
this task only added `frontend/src/features/contact/`, `CONTACT_PAGE_REDESIGN_REPORT.md`,
and modified `frontend/src/pages/ContactPage.tsx`, `frontend/src/styles/index.css`,
and `frontend/src/pages/InfoPages.test.tsx`.
