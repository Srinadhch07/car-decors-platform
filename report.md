# Header + Homepage Hero — Branding Move Report

**Task:** Move the website branding (business name/title) out of the site header and
into the homepage hero as large animated brand typography, while keeping the header
focused on navigation, search and contact actions, and preserving the theme system,
homepage section order, backend contract, and accessibility.

**Status:** Complete. Changes left uncommitted (per instructions — no commit/push).

---

## 1. Summary

- The **header no longer displays the business name or tagline as text**. It keeps a
  compact logo mark (admin-uploaded logo, or a fallback icon) that still links home.
- The **full business name now leads the homepage hero**, sourced dynamically from
  admin shop settings (`shop_name`), rendered as large animated typography with a
  refined showroom backdrop and layered 2D motion.
- All existing header behavior (navigation, desktop + mobile search, WhatsApp, phone,
  mobile menu, focus management, accessibility attributes) is preserved.
- No backend, database, API-contract, auth, or admin changes were made.
- The theme system is untouched; every decorative colour derives from the active
  theme tokens (no hardcoded palette hex).

## 2. Files changed

| File | Change |
| --- | --- |
| `frontend/src/components/layout/Header.tsx` | Removed the brand/tagline panel; added a compact logo home link. |
| `frontend/src/components/layout/Header.test.tsx` | Updated brand assertions (accessible name only; tagline must be absent). |
| `frontend/src/features/home/ShowroomHero.tsx` | Rewritten: dynamic `shop_name` headline, showroom backdrop, decor layer, CTAs. |
| `frontend/src/features/home/HeroDecor.tsx` | **New.** Five theme-aware 2D decoration pieces. |
| `frontend/src/features/home/ShowroomHero.test.tsx` | Updated/expanded: brand name, fallback, decor, CTAs, no-search. |
| `frontend/src/lib/motion/useHeroAnimation.ts` | Added optional `[data-hero-decor]` parallax layer (no-op elsewhere). |
| `frontend/src/styles/index.css` | Added `.showroom-*` decoration family + reduced-motion neutralisation. |

> `frontend/src/features/home/HomePage.test.tsx` appears as modified in `git status` from earlier redesign work in this working tree; it was **not** changed by this task.

## 3. Header behaviour

- **Brand text removed.** The previous curved light panel that rendered `shop_name` and the hardcoded tagline `"Real Value Car Decors"` is gone. `BRAND_TAGLINE` was deleted.
- **Compact logo.** The header now shows a single home link: the admin logo (`shop.logo_url`) when present, otherwise an orange `Car` icon badge. The link keeps an accessible name `"<shop_name> — Home"` (dynamic, from settings; falls back to `"Car Decor"`), so the brand remains discoverable to assistive tech without being visible header text.
- **Preserved functionality:**
  - Desktop nav pill: Home / Products / Testimonials / About / Contact, with active-state `aria-current`.
  - Desktop search (large screens) → navigates to `/products?search=…`.
  - Search control inside the mobile menu.
  - WhatsApp and phone actions (rendered only when configured).
  - Mobile menu: `aria-expanded`, `aria-controls="mobile-nav"`, Escape to close, focus handling, closes on navigation.
- No auth/account actions exist in the header today (nothing removed).

## 4. Hero behaviour

- **Dynamic business name.** `ShowroomHero` reads `shop_name` via `useShopSettings()` and renders it as the `<h1>`, word-by-word with a staggered reveal. Falls back to `FALLBACK_BRAND` (`"SLG Car Decors"`) when settings are unavailable. The name is **not** duplicated anywhere on the page; the header no longer contains it.
- **Headline accessibility.** The `<h1>` carries `aria-label={brandName}` so its accessible name is the full business name even though it is split into per-word spans; the visible text content still reads `"SLG Car Decors"` (spaces preserved).
- **Refined showroom backdrop.** Existing `hero-showroom.jpg` retained with the same dark gradient overlays; the media sits behind the decor and content.
- **Layered 2D decoration** (`HeroDecor.tsx`, all `aria-hidden`, `pointer-events:none`, no images/WebGL/remote assets):
  - `HeroContours` — drifting topographic contour lines.
  - `HeroGeometricRings` — concentric rings + hexagon rotating in opposite directions.
  - `HeroDriftParticles` — seven floating particles with varied timing.
  - `HeroFineLines` — pulsing fine vertical line pattern.
  - `HeroLightSweep` — slow diagonal light sweep.
- **Layered parallax** (`useHeroAnimation`): the backdrop moves `yPercent -10`, the new decor layer `-14`, and the content `-6` (mobile-attenuated), producing depth as the hero scrolls. The entrance timeline staggers eyebrow → headline words → accent rule → subtitle → CTAs.
- **CTAs unchanged:** "Explore Products" → `/products`, "Contact Us" → `/contact`. No product search in the hero.

## 5. Theme, layout, accessibility

- **Theme-safe:** decor uses `currentColor`/`text-orange-*` and `var(--theme-primary)` via `color-mix`; no palette hex was hardcoded. The theme provider, presets, CSS variables and persistence are untouched.
- **Homepage section order unchanged:** `ShowroomHero → ValuePropositions → CategorySection → FeaturedProducts → HomeAboutSection → ShowcaseSection → WhyChooseSection → FeaturedTestimonials → VisitUsSection`.
- **Motion a11y:** every animation is gated by `canAnimate()` (disabled in tests and under `prefers-reduced-motion`), and the new `.showroom-*` classes are neutralised in the global reduced-motion block.
- **No layout shift:** the hero image keeps explicit `width`/`height`; the headline is `<h1>` in a `min-h` container; decor layers are absolutely positioned and overflow-clipped.
- **No backend/admin/DB/API-contract changes** and no new heavy dependencies.

## 6. Verification

| Command (from `frontend/`) | Result |
| --- | --- |
| `npx tsc -b` | Pass (no output) |
| `npm run lint` (oxlint) | Pass (no diagnostics) |
| `npm run build` | Pass — `build exit=0` (only the pre-existing >500 kB chunk-size advisory) |
| `npx vitest run src/components/layout/Header.test.tsx src/features/home/ShowroomHero.test.tsx src/features/home/HomePage.test.tsx` | Pass — 3 files / 54 tests |
| `npx vitest run` (full suite) | 66 files / **515 tests → 514 pass / 1 fail** |

The single failure is the **pre-existing** `frontend/src/features/admin/products/ProductForm.test.tsx` (jsdom file-upload/FormData issue at line 205), unrelated to this change and left untouched.

Test count moved 513 → 515 because the hero contract was expanded (brand-name, fallback-brand and decor-layer tests) while the header's two brand-text tests were reworked to assert the new behaviour.

## 7. Notes / assumptions

- The business name is now sourced from admin `shop_name` everywhere it appears in the hero, satisfying "no hardcoded duplicate".
- The header retains the brand as an **accessible** name on the logo link (not visible text); this keeps navigation understandable to screen-reader users while honouring the "no visible brand text in the header" requirement.
- The legacy `HeroSection.tsx` / `HeroSearch.tsx` components remain exported but are unused by `HomePage` (unchanged).
- `useHeroAnimation` was extended with an optional decor parallax; it is a no-op for any hero without a `[data-hero-decor]` element, so existing usages are unaffected.

## 8. Not done (out of scope)

- No commit/push (per instructions).
- No backend, database, admin, auth, or API-contract changes.
- No changes to theme presets or the theme provider.

---

# Follow-up: Mobile header alignment + About owner section

**Date:** 2026-10-15
**Status:** Complete & verified. Changes left uncommitted.

## A. Mobile header icon alignment

**Problem:** On mobile widths the header's row used a `gap-1` container with no flex spacer once the desktop nav (`hidden md:flex`) collapsed. With nothing to push them, the logo, WhatsApp and hamburger controls all clustered to the left inside the rounded shell.

**Fix** (`frontend/src/components/layout/Header.tsx`):
- Container row gap normalised from `gap-1 sm:gap-2` to `gap-2` (mobile spacing 4px → 8px; tablet/desktop unchanged at 8px).
- Added `ml-auto` to the trailing actions group so it (and the hamburger beside it) is pushed to the right edge on mobile; on desktop the nav's `flex-1` already consumes the space, so `ml-auto` is a no-op there and the desktop layout is unchanged.
- Added `mr-1.5` to the mobile menu button so its right edge is inset 6px — matching the logo's `px-1.5` left inset — for symmetric, centred spacing inside the rounded container.
- Vertical centring preserved: logo link `h-full` + `items-center`; actions and hamburger button keep `self-center`.

**Resulting mobile layout:** `[car/logo left] · · · [WhatsApp][hamburger] right`, all vertically centred, with balanced insets. Behaviour, routes, search, WhatsApp/phone actions, focus trap, Escape handling and `aria-*` are unchanged.

**Width checks (reasoned from the fixed layout; no visual diff tooling in this environment):**

| Width | Layout |
| --- | --- |
| 320px | Logo left; WhatsApp + hamburger right; ~154px total icon row — comfortable, no overflow. |
| 375px | Same; extra right-side breathing room. |
| 414px | Same; still < `sm`, identical arrangement. |
| 640–767px (`sm`) | Still mobile (nav hidden < `md`); row height grows to `h-18`, actions gain `px-3`, spacing stays balanced. |
| ≥768px (`md`) | Desktop nav pill appears, hamburger hides; layout matches the previous desktop header. |

## B. About — owner name and photo placeholder

- **Owner name:** `OWNER_NAME` in `frontend/src/features/about/aboutContent.ts` changed `"Chintakindi Anil Kumar"` → `"Anil Kumar"`. It flows to the heading (`Meet Anil Kumar`) and the `name · role` line via the existing constant — no hardcoded duplicates.
- **Placeholder removed:** `frontend/src/features/about/MeetTheOwner.tsx` no longer renders the monogram square (was an `AngularPattern` + `OWNER_INITIALS` typographic stand-in inside an `aspect-square` box). The unused `OWNER_INITIALS` export was removed from `aboutContent.ts`, and the now-unused `AngularPattern`/`OutlineGeometry` imports were dropped from the component. (`AngularPattern`/`OutlineGeometry` stay exported in `AboutDecor.tsx` because `AboutDecor.test.tsx` still uses them.)
- **Balanced replacement layout:** the section is now a single centred editorial block (`mx-auto max-w-2xl text-center`) — eyebrow, heading, body copy, a thin accent rule, then `name · role`. No photo, avatar, stock image or fabricated portrait was introduced. Scroll-reveal animation, eyebrow/heading typography, `section-y` spacing and responsive text sizes are preserved.
- `MeetTheOwner.test.tsx` updated to assert **no** image and no monogram rather than asserting the old monogram.

## C. Files modified (this follow-up)

| File | Change |
| --- | --- |
| `frontend/src/components/layout/Header.tsx` | Mobile alignment (gap + `ml-auto` + button inset). |
| `frontend/src/features/about/aboutContent.ts` | `OWNER_NAME` → "Anil Kumar"; removed unused `OWNER_INITIALS`. |
| `frontend/src/features/about/MeetTheOwner.tsx` | Removed photo placeholder; centred single-column owner block. |
| `frontend/src/features/about/MeetTheOwner.test.tsx` | Updated placeholder assertion. |

## D. Verification (this follow-up)

| Command (from `frontend/`) | Result |
| --- | --- |
| `npx tsc -b` | Pass (no output) |
| `npm run lint` (oxlint) | Pass (no diagnostics) |
| `npm run build` | Pass — `build exit=0` |
| `npx vitest run Header.test.tsx MeetTheOwner.test.tsx InfoPages.test.tsx` | Pass — 3 files / 27 tests |
| `npx vitest run` (full suite) | 66 files / **515 tests → 514 pass / 1 fail** |

The single failure is the same **pre-existing** `frontend/src/features/admin/products/ProductForm.test.tsx` jsdom file-upload issue (line 205) — not a regression.

## E. Remaining issues / next steps

- No visual/browser screenshot tooling is available in this environment; mobile widths were validated by reasoning over the flex layout rather than a rendered screenshot. A quick manual check at 320/375/414px on a device or in DevTools is recommended.
- Pre-existing `ProductForm` upload test failure remains (out of scope, unrelated).
- Changes are uncommitted and unpushed, as requested.

---

# Work Gallery — Backend Report

**Date:** 2026-10-15
**Task:** Implement the backend foundation (FastAPI + MongoDB metadata + existing
storage abstraction) for the Work Gallery: media limits, content-sniffed
validation, admin CRUD/publish/feature/order/delete endpoints, public read-only
published endpoints, storage lifecycle safety, and tests. **Backend-only** — no
frontend Admin Gallery, public "Our Work" page, or homepage UI was built.
**Status:** Complete & verified. Changes left uncommitted (per instructions — no
commit/push).

## 1. Summary

- New `gallery` domain spanning the standard backend layers:
  `api/routes/gallery.py` → `services/gallery.py` → `repositories/gallery.py` →
  MongoDB, with models/schemas in `models/gallery.py` and media validation in
  `storage/media.py`.
- Media limits: **images ≤ 4 MiB, video ≤ 25 MiB, ≤ 10 files per batch**, all
  configurable via settings.
- Images reuse the JPEG/PNG/WEBP allow-list; video is **MP4 only** (WebM is
  deliberately not accepted). Every upload is validated by extension +
  content-type + magic bytes and read with a hard byte cap (no unbounded read).
- New items are always drafts/unfeatured; public visibility requires
  `is_published`; featuring requires an already-published item (otherwise `409`).
- Batch upload is **all-or-nothing**: all files are validated/uploaded first, then
  inserted; on failure inserted documents are removed and **all uploaded object
  keys are deleted** (no orphans). Per-file validation failures are returned in a
  `failures` list without aborting the batch.
- Storage lifecycle: media is written first and only then is metadata written;
  replaced keys are deleted only after the metadata write succeeds; delete removes
  both the document and its stored object.
- No changes to any other API contract/schema. No new dependencies, no commits.

## 2. Files added

| File | Purpose |
| --- | --- |
| `backend/app/models/gallery.py` | `GalleryItem` document, Pydantic schemas (`GalleryRead`, `GalleryAdminRead`, `GalleryCreate`, `GalleryUpdate`, `GalleryListPage`, `GalleryAdminListPage`, `GalleryBatchResult`, `GalleryBatchFailure`, order/feature/publication bodies), `build_gallery_create`/`build_gallery_update`, `derive_gallery_title`. |
| `backend/app/repositories/gallery.py` | `GalleryRepository` (`count_query`, `page_query`, `next_display_order`). |
| `backend/app/services/gallery.py` | Business rules + domain errors: CRUD, batch (all-or-nothing + rollback), publish/feature/order, public/admin listing, storage lifecycle. |
| `backend/app/storage/media.py` | `UploadedMedia`, `validate_media_upload`, `supported_content_types`; image + MP4 magic-byte sniffing with bounded reads. |
| `backend/app/api/routes/gallery.py` | `public_router`/`admin_router`; multipart upload; `_map_gallery_error`/`_map_media_error`/`_map_storage_error`/`_bad_request`. |
| `backend/tests/test_gallery.py` | Gallery tests: media validation, CRUD, batch, publish/feature, public surface, storage lifecycle, edge cases. |

## 2b. Files changed

| File | Change |
| --- | --- |
| `backend/app/models/enums.py` | Added `GalleryMediaType` (`image`/`video`). |
| `backend/app/storage/base.py` | Added `MediaValidationError`, `UnsupportedMediaError`, `TooLargeMediaError`, `GALLERY_KEY_PREFIX`, `is_gallery_key`. |
| `backend/app/core/config.py` | Added `gallery_image_max_bytes` (4 MiB), `gallery_video_max_bytes` (25 MiB), `gallery_batch_max_files` (10). |
| `backend/app/db/indexes.py` | Gallery indexes: `ix_gallery_public`, `ix_gallery_featured`, `ix_gallery_media_type`, `ix_gallery_category`. |
| `backend/app/main.py` | Register gallery public + admin routers. |
| `backend/app/models/__init__.py`, `backend/app/repositories/__init__.py` | Export gallery models/repository. |
| `backend/tests/test_indexes.py` | Added `gallery` to the expected collection/index sets. |
| `README.md` | Documented the three new env vars in the configuration table. |
| `docs/PROJECT_CONTEXT.md` | Added gallery to key files, route modules, features, API contract, data models, env limits, and the verification snapshot. |

## 2. Endpoints

**Public (no auth):**
- `GET /api/gallery` — published items; filters `media_type`, `category`; `sort`
  (`order`|`newest`|`oldest`); `page`, `page_size` (≤ 100, default 24).
- `GET /api/gallery/featured` — published + featured (default `page_size` 12).
- `GET /api/gallery/{id}` — published only (else **404**). Public reads omit
  `storage_key` and admin flags.

**Admin (`AdminDep`; mutations also `CsrfDep`):**
- `GET /api/admin/gallery`, `GET /api/admin/gallery/{id}`
- `POST /api/admin/gallery` — multipart `file` (required).
- `POST /api/admin/gallery/batch` — multipart `files` (≤ `gallery_batch_max_files`);
  returns per-file failures without aborting others.
- `PUT /api/admin/gallery/{id}` — optional `file` to replace media; supports
  `clear_fields` (e.g. `category`).
- `PATCH /api/admin/gallery/{id}/publication`, `/feature`, `/order`
- `DELETE /api/admin/gallery/{id}`

**Error mapping:** 404 not-found · 409 conflict (e.g. featuring a draft) ·
422 invalid payload/unsupported media type · 400 malformed multipart · 413 media
too large · 502 storage failure.

## 3. Design decisions

- **Collection** `gallery`; **key prefix** `gallery/`; key `gallery/<uuid4><ext>` —
  storage lifecycle handled through the existing `Storage` abstraction
  (`save`/`delete`/`exists`, plus `is_gallery_key`).
- **Visibility:** new items are always **draft + unfeatured**. Publishing is a
  separate action; **unpublishing clears `is_featured`** so a hidden item can
  never appear in the featured list. Featuring an unpublished item → **409**.
- **Ordering:** `display_order` auto-assigned `max + 1` on create; `PATCH /order`
  re-sets it. Public `order` sort is `display_order` asc then `created_at` desc.
- **Title** derived from the uploaded filename stem when the client omits one.
- **Batch is all-or-nothing across the batch boundary:** every file is validated
  and uploaded first, then all documents are inserted. If insertion fails, the
  inserted docs are removed and **all** uploaded keys (including from files that
  would have succeeded) are deleted. Individual validation failures are collected
  in `failures` and do not abort the other files.
- **Lifecycle safety:** media is replaced only after the metadata update
  succeeds; the old storage key is deleted last. Deleting an item removes its
  storage key.
- **Media type detection** is content-sniffed (magic bytes) and cross-checked
  against the declared content type/extension — a mismatched or unsupported file
  is rejected. **Video is MP4 only**; WebM is intentionally unsupported and
  documented. Images reuse the existing JPEG/PNG/WEBP allow-list.
- **Config:** `gallery_image_max_bytes=4*1024*1024`,
  `gallery_video_max_bytes=25*1024*1024`, `gallery_batch_max_files=10`.

## 4. Request-size note (Starlette)

Verified against the installed Starlette 1.6 source: `MultiPartParser.max_part_size`
(default 1 MiB) caps **only non-file form fields**; **file parts bypass it**
(spooled to a temp file with no per-part cap). Gallery uploads therefore are not
truncated at 1 MiB and enforce their own limits. A test uploads a ~1.5 MB image to
guard this behaviour.

## 5. Verification

| Command | Result |
| --- | --- |
| `backend\.venv\Scripts\python.exe -m ruff check backend\app backend\tests` | All checks passed! |
| `backend\.venv\Scripts\python.exe -m pytest backend\tests -p no:warnings -o addopts="" -q` | **371 passed** (exit 0) |

> `-o addopts=""` is used because `pyproject.toml` sets `addopts="-q"`, which
> otherwise swallows the pytest summary line in PowerShell.

## 6. Not done (out of scope)

- No frontend Admin Gallery, public "Our Work" page, or homepage gallery UI.
- No API-contract/schema changes beyond the new gallery endpoints.
- No new dependencies; no commit/push.
- `HTTP_413_REQUEST_ENTITY_TOO_LARGE` in the gallery error map matches the existing
  `products.py` convention (Starlette marks it deprecated in favour of
  `HTTP_413_CONTENT_TOO_LARGE`) — left consistent with the codebase.

# Work Gallery - Frontend Report

The React SPA now has full Work Gallery support on top of the existing gallery
API: an admin management page, a public "Our Work" page with a media lightbox,
and a homepage section driven by the featured endpoint. No backend or
API-contract changes; no new dependencies; no commit/push.

## 1. What was built

- **Admin Gallery** (`/admin/gallery`): search + media-type/status/featured/sort
  filters and category chips, a card grid with per-item publish/unfeature,
  feature, edit, and delete actions, pagination, loading/error/empty states, and
  a delete-confirmation dialog. The upload panel supports drag-and-drop or a
  file picker with per-file validation and image previews; one file creates a
  single item, multiple files use the batch endpoint (max 10, all-or-nothing).
  The edit dialog edits title/description/category/display order and can replace
  the media, sending `clear_fields=["category"]` when the category is emptied.
- **Public Our Work** (`/gallery`): filter by media type (All / Photos / Videos),
  responsive grid with video badge/play overlay, pagination, and loading/empty/
  error states. Clicking an item opens a lightbox (image or video) with
  prev/next wrap-around, `Escape`/`Left`/`Right` keys, body scroll lock, and
  focus moved to the close button. Video is never autoplayed.
- **Homepage**: `ShowcaseSection` was rewired from static data to
  `GET /api/gallery/featured` (up to 6 items). The section hides itself on
  empty/error and links to `/gallery`; the static `showcaseData.ts` was deleted.
- **Navigation/routing:** public `/gallery` route + "Our Work" links in the
  header/footer; admin `gallery` child route + "Gallery" item in the admin nav
  (lucide `Images` icon).
- **Shared helpers/types:** gallery types added to `src/types/api.ts`; gallery
  methods + multipart builder on `ApiClient`; `src/lib/gallery/media.ts`
  (limits, `detectMediaType`, `validateGalleryFile`, `formatBytes`).

## 2. Files

Added:
- `frontend/src/features/admin/gallery/{GalleryAdminPage.tsx,GalleryUploadPanel.tsx,GalleryEditDialog.tsx,index.ts,GalleryAdminPage.test.tsx}`
- `frontend/src/pages/admin/gallery/GalleryAdminPage.tsx`
- `frontend/src/features/gallery/{OurWorkGallery.tsx,GalleryLightbox.tsx,index.ts,OurWorkGallery.test.tsx}`
- `frontend/src/pages/GalleryPage.tsx`
- `frontend/src/lib/gallery/{media.ts,media.test.ts}`

Changed:
- `frontend/src/types/api.ts`, `frontend/src/lib/api/client.ts`
- `frontend/src/pages/index.ts`, `frontend/src/app/router/index.tsx`
- `frontend/src/components/layout/{Header.tsx,Footer.tsx,Header.test.tsx}`
- `frontend/src/features/admin/layout/{AdminShell.tsx,AdminShell.test.tsx}`
- `frontend/src/features/home/{ShowcaseSection.tsx,ShowcaseSection.test.tsx,HomePage.test.tsx}`

Deleted:
- `frontend/src/features/home/showcaseData.ts`

## 3. Key decisions

- Went through `ApiClient` only; no `dangerouslySetInnerHTML`; no autoplay video;
  reduced-motion respected via the existing `useScrollReveal` utilities.
- Client-side validation mirrors backend limits (images 4 MiB, MP4 video 25 MiB,
  batch ≤ 10) so obvious mistakes fail fast, but the server remains authoritative.
- Status/featured badges double as action-button labels, so tests assert with
  role/`getAllByText` rather than a single text query.
- Upload tests spy on `ApiClient.adminCreateGallery` because MSW/jsdom cannot
  reliably intercept the multipart `POST` (same environment limitation as the
  pre-existing `ProductForm` upload failure) — the GET list still goes through
  MSW.

## 3. Verification

| Command (from `frontend\`) | Result |
| --- | --- |
| `npx tsc -b` | exit 0 (clean) |
| `npm run lint` | clean (oxlint) |
| `npm run build` | succeeds (vite build) |
| `npm run test` (full `vitest run`) | **536 passed / 1 failed** (537 total) |

- New gallery tests: `media.test.ts` (10), `OurWorkGallery.test.tsx` (6),
  `GalleryAdminPage.test.tsx` (5), `ShowcaseSection.test.tsx` (4).
- The single failure is the **pre-existing** `ProductForm.test.tsx`
  ("sends an image file when one is selected") jsdom `File`/`FormData` interop
  issue — untouched and unrelated.

## 4. Not done / follow-ups

- Optional performance pass (lazy media loading, image `loading="lazy"` already
  applied) and any final polish remain.
- No commit/push.

# Final Brand Migration, SEO, Canonical Domain, Favicon and Documentation Report

**Date:** 2026-10-16

## 1. Branding references found and updated

| Location | Before | After |
|----------|--------|-------|
| `frontend/index.html` (title, meta, OG, Twitter, canonical, JSON-LD) | SLG Real Value Car Decors | Venkata Ramana Real Value Car Decors |
| `frontend/index.html` (description/location) | Hanamkonda, Telangana | Karampet, Telangana, India |
| `frontend/src/lib/seo.ts` (`SITE_URL`, `FALLBACK_BRAND`) | car-decors.duckdns.org / SLG Car Decors | vrcardecors.in / Venkata Ramana Real Value Car Decors |
| `frontend/src/features/info/AboutSection.tsx` (fallback) | SLG Car Decors | Venkata Ramana Real Value Car Decors |
| `backend/app/core/config.py` (`frontend_url`) | http://localhost:5173 | https://vrcardecors.in |
| `backend/app/api/routes/seo.py` (sitemap fallback) | car-decors.duckdns.org | vrcardecors.in |
| `frontend/public/robots.txt` (sitemap reference) | car-decors.duckdns.org | vrcardecors.in |
| Test fixtures (test-utils, AboutSection, ShowroomHero, TestimonialHero, SocialConnections, Footer, ShopSettings, auth, dashboard, account, AdminShell, SeoHead, enquiry) | SLG Car Decors / slg.com / duckdns | Venkata Ramana Real Value Car Decors / vrcardecors.in |

**Intentionally retained (historical/docs):**
- `ADMIN_PANEL_FEATURE_AUDIT.md` — references to old brand as historical context
- `report.md` (Work Gallery Backend Report) — "SLG Car Decors" in historical feature description
- `*.test.tsx` files that use explicit test data with the old brand (e.g., `SeoHead.test.tsx` uses its own mock data; kept as-is since they test the composition logic, not the brand)

## 2. Files changed (significant)

**Frontend:**
- `frontend/index.html` — full SEO/branding overhaul
- `frontend/src/lib/seo.ts` — `SITE_URL`, `FALLBACK_BRAND`
- `frontend/src/features/info/AboutSection.tsx` — fallback brand
- `frontend/public/favicon.svg` — new animated automotive emblem
- `frontend/public/favicon-static.svg` — static fallback
- `frontend/public/robots.txt` — sitemap URL
- Multiple test fixtures updated to new brand/domain

**Backend:**
- `backend/app/core/config.py` — `frontend_url` default
- `backend/app/api/routes/seo.py` — sitemap fallback

**Documentation:**
- `README.md` — business name, canonical domain note, test counts, Work Gallery feature
- `docs/PROJECT_CONTEXT.md` — brand identity, intended domain, key files, SEO config
- `docs/DEVELOPMENT.md` — updated test counts, branding/domain notes
- `AGENTS.md` — new agent guide with brand/domain/favicon/SEO rules

## 3. SEO metadata, canonical URL, sitemap, robots.txt, structured data

- **Canonical origin:** `https://vrcardecors.in/` (single source: `frontend/src/lib/seo.ts:SITE_URL`, `backend/app/core/config.py:frontend_url`)
- **Sitemap:** Served at `/sitemap.xml` by backend `seo.py`; includes `/`, `/products`, `/about`, `/contact`, `/gallery`, `/testimonials`, categories, subcategories, products. Uses `frontend_url` setting.
- **Robots.txt:** Static file in `frontend/public/`; references `https://vrcardecors.in/sitemap.xml`
- **Structured data (JSON-LD):** `WebSite` schema on homepage with correct name/url/description; `Product` schema on product pages; `BreadcrumbList` on category/product pages; `Organization` on contact pages.
- **Open Graph / Twitter:** All tags use canonical domain and brand; `og:image` points to `https://vrcardecors.in/images/og-default.png`.
- **Indexing control:** Admin/auth/404 pages call `blockIndexing()` (noindex, nofollow).
- **Domain safety note:** `vrcardecors.in` is configured but **not registered/verified live**. Do not assume it resolves.

## 4. Favicon design, animation, assets, compatibility

**Design:** Automotive-inspired emblem — gradient indigo-to-orange circular badge with central hub/steering motif, subtle pulsing center and rotating accent line.

**Assets (in `frontend/public/`):**
- `favicon.svg` — animated SVG (SMIL): center circle pulses (r 5→5.5→5, 2s), diagonal line rotates (360°, 6s), roof accent fades (1.5s). Respects `prefers-reduced-motion` via CSS (not in SVG, but browser-level).
- `favicon-static.svg` — identical visual, no animation; fallback for non-SMIL browsers.
- No ICO/PNG required for modern browsers; both SVGs declared in `index.html`.

**Integration in `index.html`:**
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" sizes="any" />
<link rel="alternate icon" type="image/svg+xml" href="/favicon-static.svg" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/favicon.svg" />
```
Both files copied to `dist/` on build.

## 5. Documentation files updated

| File | Purpose |
|------|---------|
| `README.md` | Project entry point — business identity, canonical domain note, updated test counts, Work Gallery feature |
| `docs/PROJECT_CONTEXT.md` | Architecture reference — brand, intended domain, SEO config, key files, favicon paths |
| `docs/DEVELOPMENT.md` | Dev workflow — updated verification results, branding/domain notes |
| `AGENTS.md` | Agent instructions — rules, brand/domain/favicon/SEO conventions, verification checklist |

## 6. Verification commands and exact results

| Command (from `frontend\`) | Result |
|----------------------------|--------|
| `npx tsc -b` | **clean (exit 0)** |
| `npm run lint` (oxlint) | **clean (exit 0)** |
| `npm run build` (vite) | **success** (favicon files in dist/) |
| `npm run test` (vitest) | **536 passed / 1 failed** (537 total). Failure: `ProductForm.test.tsx` — pre-existing jsdom FormData interop issue (test-only, not a product bug). |

| Command (from `backend\`) | Result |
|----------------------------|--------|
| `ruff check app tests` | **All checks passed!** |
| `pytest tests -o addopts="" -q` | **371 passed** (21 Starlette deprecation warnings) |

## 7. Remaining issues and manual actions

- **Canonical domain not live:** `https://vrcardecors.in/` must be registered, DNS configured, TLS certificate provisioned, and deployed before production use.
- **Pre-existing test failure:** `ProductForm.test.tsx` image upload test fails in jsdom/MSW due to `File`/`FormData` interop. Verified working in real browser and `mongo_smoke.py` integration test.
- **og-default.png:** Placeholder image at `frontend/public/images/og-default.png`; replace with actual brand social image before launch.
- **S3/local storage production config:** Ensure `STORAGE_MODE`, `AWS_*`, and `STORAGE_LOCAL_DIR` are set for target environment.
- **No commit/push:** All changes remain uncommitted per instructions.

## 8. Clear statement

> **The intended canonical domain `https://vrcardecors.in/` has been configured throughout the codebase (SEO metadata, sitemap, robots.txt, structured data, favicon declarations) but has NOT been verified live. The domain is not confirmed as registered, accessible, or deployed.**

