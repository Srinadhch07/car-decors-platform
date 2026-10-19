# PROJECT_CONTEXT.md — Car Decor Platform

Knowledge base for AI agents. Read this before changing code. Deeper business
overview lives in `README.md`; commands in `docs/DEVELOPMENT.md`; the agent rules
in `AGENTS.md`.

## 1. What it is
A storefront + admin console for **Venkata Ramana Real Value Car Decors** (brand name),
a car-decor accessories shop. Public visitors browse a catalog and contact the shop
via WhatsApp/phone (enquiry-driven — there is no checkout or payment). The single
admin account manages catalog, inventory, shop settings, and customer testimonials.

## 1b. Intended production origin
`https://vrcardecors.in/` — configured as the canonical domain across SEO metadata,
sitemap.xml, robots.txt, and Open Graph/Twitter tags. **Not yet live/verified.**
Do not assume the domain resolves or has been registered.

## 2. Stack
- **Backend:** Python >= 3.11, FastAPI, Pydantic v2, async PyMongo, Argon2id
  (`argon2-cffi`), PyJWT, `python-multipart`; dev: pytest, pytest-asyncio, httpx,
  mongomock, ruff.
- **Frontend:** React 19, TypeScript ~6.0, Vite 8, react-router-dom 7, Tailwind CSS 4,
  lucide-react, gsap; dev: Vitest, Testing Library, MSW, oxlint.
- **DB:** MongoDB (default `mongodb://localhost:27017`, db `car_decor`), indexes
  ensured at startup. **Storage:** pluggable — local (`storage-local/`, served at
  `/media`) or S3.

## 3. Architecture & request flow
```
React SPA (:5173)  ──/api + /media proxy──▶  FastAPI (:8000)
                                              routes → services → repositories → MongoDB
```
- Layers: `api/routes/*.py` (HTTP, validation, error mapping) → `services/*`
  (business rules, domain errors) → `repositories/*` (all Mongo access via
  `BaseRepository`) → MongoDB. Models/schemas in `models/`.
- `backend/app/main.py`: `create_app()` factory — mounts routers under `/api`,
  CORS, static `/media`, ensures indexes, SEO routes at root.
- `main.py` is also the ASGI entry (`app = create_app()`).

## 4. Key files
| Area | Path |
|------|------|
| App factory / ASGI entry | `backend/app/main.py` |
| Config (`Settings`) | `backend/app/core/config.py` |
| DB lifecycle | `backend/app/core/db.py` |
| Security (JWT/Argon2/CSRF) | `backend/app/core/security.py` |
| Auth deps (`require_admin`, `verify_csrf`) | `backend/app/api/dependencies.py` |
| Indexes | `backend/app/db/indexes.py` |
| Base document / `Money`/`PyObjectId` | `backend/app/models/base.py` |
| Image validation | `backend/app/storage/images.py` |
| Gallery media validation | `backend/app/storage/media.py` |
| Seed CLI | `backend/scripts/seed.py` |
| Frontend router | `frontend/src/app/router/index.tsx` |
| API client (`ApiClient`) | `frontend/src/lib/api/client.ts` |
| Shared API types | `frontend/src/types/api.ts` |
| Test setup (MSW/jest-dom) | `frontend/src/test-setup.ts`, `frontend/src/test-utils.tsx` |
| SEO helpers (`SITE_URL`, `FALLBACK_BRAND`, `applySeo`) | `frontend/src/lib/seo.ts` |
| Animated favicon + static fallback | `frontend/public/favicon.svg`, `frontend/public/favicon-static.svg` |

Route modules: `auth, catalog, products, shop, testimonials, gallery, health, seo`.

## 5. Features
- **Public catalog:** product list with search (`name`/`description`/`vehicle_tags`,
  escaped regex), filters (category, subcategory, vehicle, availability),
  whitelisted sort (`newest, oldest, name_asc, name_desc, price_asc, price_desc`;
  price sorting done in the service layer, unpriced last), pagination
  (`page`, `page_size` ≤ 100, default 20). Category pages + product detail (slug).
- **Admin console** (`/admin`, cookie session): dashboard counts, product CRUD with
  optional image upload/replace/delete, category + subcategory CRUD, shop settings,
  testimonials moderation, account (email/password) management.
- **Inventory / stock:** `stock_quantity` on products; admin-only PATCH with a
  `delta` (±1 quick adjust); public read exposes availability only, never the count.
- **External links:** products may carry an `external_url` (http/https only).
- **Testimonials:** public submit (`pending`, honeypot `website` field, rate-limited);
  public list + featured; admin approve/reject, publish, feature, edit, delete.
- **Image uploads:** JPEG/PNG/WEBP only, validated by content-type + extension +
  magic bytes + size; ≤ 5 MB (413 otherwise).
- **Work Gallery:** one image/video per item with title/description/optional
  category and a curated display order. Limits: images 4 MiB, MP4 video 25 MiB,
  batch ≤ 10 files. New items are drafts; public visibility requires
  `is_published`, and featuring requires an already-published item. Admin CRUD +
  batch upload, publish/unpublish, feature/unfeature, reorder, delete; public
  list/filter (media type, category), featured list, and detail.
  Frontend: admin Gallery page (`/admin/gallery`, upload/batch/edit/publish/
  feature/order/delete), public "Our Work" page (`/gallery`, media filter +
  keyboard lightbox), and a homepage featured-work section driven by
  `GET /gallery/featured` (hidden when empty/unavailable).

## 6. API contract (`/api` prefix unless noted)
Public (no auth):
- `GET /health`, `GET /health/ready` (503 if Mongo down)
- `GET /shop`; `GET /categories`, `/categories/{slug}`, `/categories/{slug}/subcategories`
- `GET /products` (query: `search, category, subcategory, vehicle, availability, sort, page, page_size`), `GET /products/{slug}`
- `GET /testimonials`, `GET /testimonials/featured`; `POST /testimonials`
- `GET /gallery` (query: `media_type, category, sort, page, page_size`),
  `GET /gallery/featured`, `GET /gallery/{id}` (published only)
- `GET /sitemap.xml` (root, no prefix)

Admin — require `AdminDep` (JWT cookie); **all state-changing admin calls also require
`CsrfDep`** (double-submit `X-CSRF-Token` ↔ `car_decor_csrf` cookie):
- Auth: `POST /admin/auth/login` (rate-limited, no CSRF), `GET /me`,
  `POST /logout|/change-email|/change-password` (auth + CSRF),
  `POST /forgot-password|/reset-password` (public, rate-limited)
- Shop: `GET /admin/shop`, `PUT /admin/shop`
- Categories: `GET|POST /admin/categories`, `GET|PUT|DELETE /admin/categories/{id}`
- Subcategories: `GET|POST /admin/subcategories`, `GET|PUT|DELETE /admin/subcategories/{id}`
- Products: `GET /admin/products`, `GET /admin/products/{id}`,
  `POST /admin/products` (multipart), `PUT /admin/products/{id}` (multipart),
  `PATCH /admin/products/{id}/stock` (body `delta`), `DELETE /admin/products/{id}`
- Testimonials: `GET /admin/testimonials`, `PUT /admin/testimonials/{id}`,
  `PATCH /admin/testimonials/{id}/status|/publication|/feature`,
  `DELETE /admin/testimonials/{id}`
- Work gallery: `GET /admin/gallery`, `GET /admin/gallery/{id}`,
  `POST /admin/gallery` (multipart), `POST /admin/gallery/batch` (multipart,
  ≤ 10 files), `PUT /admin/gallery/{id}` (multipart, optional media replace),
  `PATCH /admin/gallery/{id}/publication|/feature|/order`,
  `DELETE /admin/gallery/{id}`

Errors: domain errors map to 4xx; `404` not found, `409` conflict/visibility,
`413` upload too large, `422` validation, `503` readiness.

## 7. Data models (MongoDB collections)
- `admin_users` — email (unique, lowercased), `password_hash` (Argon2id),
  `password_reset_token_hash` (+ expiry, single-use), `token_version` (bumped on
  password/email change to revoke old JWTs).
- `categories` — name, slug (unique), description, image_url, is_active, sort_order.
- `subcategories` — `(category_id, slug)` unique, name, description, is_active, sort_order.
- `products` — name, slug (unique), description, `price` (`Decimal128`|null), tags,
  `vehicle_tags`, category_id, subcategory_id, `image_url`, `external_url`,
  `stock_quantity`, availability enum (`in_stock|out_of_stock|on_order`), is_active.
  Indexes: slug, category_id, subcategory_id, `(is_active, availability)`.
- `testimonials` — customer_name, text, rating (1–5), status
  (`pending|approved|rejected`), published, is_featured, consent, moderation_note.
  Public visibility requires `status=approved AND published AND consent`.
- `gallery` — title, description, optional category, `media_type` (`image|video`),
  `storage_key`, `url`, `mime_type`, `size_bytes`, `is_published`, `is_featured`,
  `display_order`. Public visibility requires `is_published`; featuring requires a
  published item. Indexed on `(is_published, display_order, created_at)`,
  `(is_published, is_featured, display_order)`, `(media_type, is_published)`, and
  `(category, is_published)`.
- `shop_settings` — singleton: shop_name, whatsapp_number, phone, address,
  business_hours, social_links, logo_url, theme.

Client-serialized shape: `_id` → `id` string; `Decimal128` → string; datetimes ISO.

## 8. Environment variables
Backend (`backend/.env.example` — names only; set real values locally, never commit):
- App/DB: `APP_NAME, APP_VERSION, APP_ENV, DEBUG, LOG_LEVEL, API_PREFIX, MONGO_URI,
  MONGO_DB_NAME, MONGO_TIMEOUT_MS, CORS_ORIGINS`
- Auth: `JWT_SECRET, JWT_ACCESS_MINUTES, COOKIE_NAME, CSRF_COOKIE_NAME,
  COOKIE_DOMAIN, COOKIE_SECURE, COOKIE_SAMESITE, LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MINUTES`
- Mail/reset: `SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL,
  FRONTEND_URL, PASSWORD_RESET_TOKEN_MINUTES, FORGOT_PASSWORD_RATE_LIMIT_*,
  RESET_PASSWORD_RATE_LIMIT_*`
  - `FRONTEND_URL` is the canonical storefront origin used for password-reset links and sitemap host. **Intended production value: `https://vrcardecors.in`**.
- Limits: `TESTIMONIAL_SUBMIT_RATE_LIMIT_*, PRODUCT_IMAGE_MAX_BYTES,
  GALLERY_IMAGE_MAX_BYTES, GALLERY_VIDEO_MAX_BYTES, GALLERY_BATCH_MAX_FILES`
- Storage: `STORAGE_MODE, STORAGE_LOCAL_DIR, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
  AWS_REGION, AWS_S3_BUCKET, AWS_S3_PUBLIC_URL`
- Seed CLI: `SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_PASSWORD_HASH,
  SEED_SAMPLE_DATA`

Frontend: `VITE_API_BASE_URL` (empty = same origin; dev uses the Vite proxy).
Production details: `PRODUCTION_CONFIGURATION.md`.

### SEO / canonical domain configuration
- Frontend: `SITE_URL` in `frontend/src/lib/seo.ts` is the canonical origin (`https://vrcardecors.in`).
- Backend: `frontend_url` in `backend/app/core/config.py` defaults to the same origin for sitemap generation.
- Both are single sources of truth; no duplicated domain strings in code.

## 9. Conventions & decisions
- Routers thin; business rules + Mongo queries only via services/repositories.
- Money is `Decimal128` (string in JSON); never float. Datetimes authored as naive UTC.
- Auth = stateless JWT in httpOnly `car_decor_session` cookie + CSRF double-submit.
- SEO/sitemap builds public absolute URLs; `ProductForm`/public pages render text
  directly (no `dangerouslySetInnerHTML`).
- Frontend talks only to `ApiClient` (`credentials: "include"`, auto `X-CSRF-Token`
  on non-GET, errors as `ApiRequestError`).

## 10. Verification status (last run, working tree)
- Backend: `pytest` **371 passed**; `ruff check` clean.
- Frontend: **536 passed / 1 failed** (537 total); `oxlint` clean; `tsc -b` clean;
  `vite build` succeeds.
- Gallery frontend tests: `media.test.ts` (10), `OurWorkGallery.test.tsx` (6),
  `GalleryAdminPage.test.tsx` (5), `ShowcaseSection.test.tsx` (4).
- **Known failure (pre-existing, test-only):** `ProductForm.test.tsx` — image-upload
  case hits a jsdom 30 / vitest 5 `File`/`FormData` interop error (`_buffer`).
  Not a product bug; do not pin deps or weaken the test.
- Related docs: `docs/ADMIN_ARCHITECTURE_CONTRACT.md` is a frozen, historical
  Admin V1 build contract — consult it only for that work, not current behavior.
  `README.md`/`VERSION.md` carry older test counts; this file is the current map.
