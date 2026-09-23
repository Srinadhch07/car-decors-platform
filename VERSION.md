# Car Decor Platform — Version & Release Baseline

**Documented baseline:** v1.0.0
**Type:** First stable feature-complete release of the platform.
**Date:** Baseline documented against the current repository state (this working tree).

> Publishing note: this version document is the release of record for the v1.0.0
> baseline. In-code metadata strings (e.g. `APP_VERSION` in `backend/.env.example`,
> the `version` fields in `backend/pyproject.toml` and `frontend/package.json`)
> still carry pre-release values (0.1.0 / 0.0.0) and are environment-configurable;
> they are left untouched because this release is **documentation-only**.

---

## 1. What Is Being Released

v1.0.0 delivers the complete Car Decor Platform:

- A **public storefront** (React SPA) with a browsable, filterable, sortable
  product catalog, category pages, product detail pages with image + availability
  + price (or "Contact for price"), About/Contact pages, and WhatsApp/phone
  enquiry CTAs.
- A **private admin console** (same SPA, `/admin`) with secure cookie-session
  login, a dashboard of live catalog counts, product CRUD with optional image
  upload/replace/delete, category and subcategory CRUD, and editable shop settings.
- A **FastAPI backend** providing public + admin REST APIs, MongoDB persistence,
  Argon2id password hashing, JWT sessions in httpOnly cookies, CSRF protection,
  login rate limiting, validated image uploads, and a pluggable storage layer.

---

## 2. Architecture Overview

```
Browser / SPA (React + Vite + Tailwind, port 5173 in dev)
        │  /api/*  and  /media/*  proxied to :8000 in dev
        ▼
FastAPI application factory (backend/app/main.py)
  ├── Routers      : auth, catalog, health, products, shop (prefix /api)
  ├── Middleware   : CORS (configured origins), cookie handling
  ├── Services     : business rules (auth, catalog, products, shop)
  ├── Repositories : data access over MongoDB (src/repositories)
  ├── Models       : Pydantic v2 request/response schemas
  ├── Storage      : Storage ABC → LocalStorageAdapter | S3StorageAdapter
  ├── Core         : config (pydantic-settings), db lifecycle, rate_limit,
  │                  security (JWT/Argon2id/CSRF), slugs, validation
  └── Indexes      : ensured on startup (app/db/indexes.py)
        ▼
MongoDB (async PyMongo; local default mongodb://localhost:27017, db "car_decor")
```

Key design decisions:

- **Documentation/Authentication.** Admin sessions are stateless JWTs stored in an
  httpOnly cookie (`car_decor_session`) with a parallel readable CSRF cookie
  (`car_decor_csrf`) verified by a `X-CSRF-Token` header on state-changing
  requests (double-submit pattern).
- **Business logic and data access are separated** (`services/` vs `repositories/`)
  so route handlers stay thin and rules are unit-testable.
- **Storage is abstracted** behind a common interface so local development and
  production object storage (Amazon S3) share one code path.
- **Money is stored precisely** as BSON `Decimal128` and serialized as a decimal
  string; MongoDB-side price sorting is deliberately avoided (done in the service
  layer) to prevent float drift.
- **The drop safety rails work without real infrastructure:** tests use mongomock
  (in-memory) and a fake in-memory storage backend, so `pytest` runs offline.

---

## 3. Repository Structure

Monorepo layout (create/update docs, do not duplicate):

```
car-decor-platform/
├── README.md                    # Business + technical overview (this release)
├── VERSION.md                   # This file — whole-platform baseline
├── docs/
│   └── ADMIN_ARCHITECTURE_CONTRACT.md  # Admin frontend ↔ backend contract
│
├── backend/
│   ├── README.md                # Backend quickstart
│   ├── VERSION.md               # Backend v1.0.0 details
│   ├── pyproject.toml
│   ├── .env.example             # Complete documented env surface (no secrets)
│   ├── app/
│   │   ├── api/routes/          # auth.py, catalog.py, health.py, products.py, shop.py
│   │   ├── core/                # config.py, db.py, rate_limit.py, security.py,
│   │   │                        #   slugs.py, validation.py
│   │   ├── db/                  # indexes.py, dependencies.py
│   │   ├── models/              # admin_user, auth, base, category, enums,
│   │   │                        #   product, shop_settings, subcategory
│   │   ├── repositories/        # data access layer
│   │   ├── services/            # auth, catalog, products, shop
│   │   ├── storage/             # base, local, b2, images, dependencies
│   │   └── main.py              # create_app() factory + ASGI entry
│   ├── scripts/seed.py          # idempotent CLI seed (admin/shop/samples)
│   ├── mongo_smoke.py           # real-MongoDB + local-storage smoke run
│   └── tests/                   # pytest suite (mongomock + MemoStorage)
│
├── frontend/
│   ├── README.md                # Frontend quickstart
│   ├── VERSION.md               # Frontend v1.0.0 details
│   ├── package.json / vite.config.ts
│   └── src/
│       ├── app/router/          # route table (public + admin)
│       ├── components/          # ui/ primitives + layout/ Header, Footer, Layout
│       ├── context/             # ShopSettingsContext
│       ├── features/            # admin/ (auth, catalog, products, shop, layout),
│       │                        #   categories/, home/, info/, products/
│       ├── lib/                 # api/client.ts (ApiClient), utils/
│       ├── pages/               # public pages + pages/admin/**
│       ├── styles/index.css     # Tailwind design tokens
│       └── types/api.ts         # shared API contract types
│
└── storage-local/              # dev-mode local storage (git-ignored)
```

---

## 4. Backend (see backend/VERSION.md for details)

- **Stack:** Python >= 3.11, FastAPI >= 0.115, Pydantic v2, PyMongo >= 4.9,
  argon2-cffi, pyjwt, python-multipart, pydantic-settings. Dev: pytest,
  pytest-asyncio, httpx, mongomock, ruff.
- **API prefix:** `/api`. Liveness `/api/health`, readiness `/api/health/ready`.
- **Auth:** `POST /api/admin/auth/login`, `GET /api/admin/auth/me`,
  `POST /api/admin/auth/logout` (cookie + CSRF; login rate limit 5/15 min per IP).
- **Shop:** `GET /api/shop` (public), `GET|PUT /api/admin/shop` (admin).
- **Catalog:** public reads `/api/categories`, `/api/categories/{slug}`,
  `/api/categories/{slug}/subcategories`; admin CRUD under `/api/admin/categories`
  and `/api/admin/subcategories`.
- **Products:** public list `/api/products` (search/category/subcategory/vehicle/
  availability/sort/page/page_size) and detail `/api/products/{slug}`; admin CRUD
  under `/api/admin/products` with multipart image upload.
- **Image upload:** JPEG/PNG/WEBP only; content-type + extension + magic bytes
  checked; ≤ 5 MB (413 when too large); image stored via the storage adapter and
  surfaced as `image_url`.
- **Storage:** `local` (default; files in `storage-local/`, served at `/media`) or
  `s3` (Amazon S3, requires `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` /
  `AWS_S3_BUCKET`).
- **DB:** MongoDB, database `car_decor` by default. Indexes ensured at startup:
  unique admin email, unique category slug, unique `(category_id, slug)`
  subcategories, product indexes on slug / category / subcategory / active /
  availability.

---

## 5. Frontend (see frontend/VERSION.md for details)

- **Stack:** React 19.2, TypeScript ~6.0, Vite 8.3, Tailwind CSS 4.3,
  react-router-dom 7.18, lucide-react, Vitest + Testing Library + MSW, oxlint.
- **Routes (public):** `/` (home), `/products`, `/products/:slug`,
  `/categories/:slug`, `/about`, `/contact`; catch-all 404.
- **Routes (admin):** `/admin/login`, `/admin` (shell) with children:
  dashboard, `products`, `products/new`, `products/:productId/edit`, `categories`,
  `subcategories`, `shop`.
- **Data layer:** a single `ApiClient` (`src/lib/api/client.ts`) sends cookies
  (`credentials: "include"`), attaches `X-CSRF-Token` on non-GET requests, and
  maps errors to `ApiRequestError`.
- **Shop context:** `ShopSettingsContext` loads public shop settings once and
  powers header/footer, contact info, and WhatsApp CTAs.
- **Admin auth:** `AdminAuthContext` restores the session via `/auth/me`,
  and signs in/out via `/auth/login` + `/auth/logout`.

---

## 6. Validation Summary (v1.0.0, actually run)

### Backend — `backend/`
| Check | Command | Result |
|-------|---------|--------|
| Unit/API suite | `python -m pytest` | **195 passed** (6 deprecation warnings) |
| Lint | `python -m ruff check .` | **passed** (exit 0) |
| Format | `python -m ruff format --check .` | **66 files already formatted** |
| Integration smoke | `python mongo_smoke.py` | **68/68 passed** (live MongoDB + local storage) |
| Liveness | `GET /api/health` | 200 `{status: ok, app, version, environment}` |
| Readiness | `GET /api/health/ready` | 200 `{status: ok, database: up}` |

### Frontend — `frontend/`
| Check | Command | Result |
|-------|---------|--------|
| Unit suite | `npm run test` | **289 passed / 1 failed** (25 files) |
| Type check | `npx tsc -b` | **clean** (exit 0) |
| Production build | `npm run build` | **success** |
| Lint | `npm run lint` (oxlint) | clean at last verified run |

---

## 7. Known Issues (v1.0.0)

1. **Frontend test-only failure (not a bug):** `ProductForm.test.tsx` — 1 test
   fails with a jsdom `FormData`/MSW `_buffer` interop error and a `waitFor`
   timeout during multipart product create/update. Product uploads work in
   production (verified via `mongo_smoke.py` and a real browser). Test-only,
   pre-existing, deterministic.
2. **Readiness reports MongoDB state** — `GET /api/health/ready` is 503 while
   MongoDB is unreachable (intended probe semantics for restarts/orchestration).
3. **Starlette deprecation warning** for `HTTP_413_REQUEST_ENTITY_TOO_LARGE`
   (6 instances during pytest); cosmetic, planned cleanup.

---

## 8. Versioning Policy & Future

- Version identity lives in this `VERSION.md` and the per-app `VERSION.md` files.
- v1.0.0 is the **first stable documentation baseline**. It is a
  documentation-only release: no application/source code was modified for this
  release.
- Future releases should follow SemVer, update **all three** VERSION files
  together, and add tested, in-scope features (orders & payments, expanded
  galleries, deployment automation, etc.) as described in `README.md` §9.
- Never generate duplicate docs: update `README.md` / VERSION files in place.