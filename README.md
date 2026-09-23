# Car Decor Platform

A production-grade web platform for a car decor and accessories business. It pairs a
**public storefront** where customers browse and enquire about products with a
**private admin console** where the shop owner manages the catalog, product images,
and business details — all backed by a FastAPI + MongoDB API. **v1.0.0** is the
documented stable baseline.

---

## 1. Business Overview

Car accessories are a high-touch, trust-driven business. Customers want to see what
is available, confirm it fits their vehicle, check availability, and then talk to a
real person about price and delivery. The Car Decor Platform is built around that
reality: the storefront presents a clean, browsable catalog with vehicle fitment
tags and availability labels, and every enquiry is routed to the shop via WhatsApp
(or phone), where a human closes the sale.

This is deliberately **not** a one-click checkout store. The platform supports the
existing sales model of a car accessories shop rather than replacing it: discovery
and information online, conversation and close offline.

### Business Model / Platform Concept

- **Storefront:** Public catalog with categories, subcategories, search, vehicle
  filters, availability labels, and product detail pages with photos and prices (or
  "Contact for price").
- **Enquiry-driven conversion:** Every product page and the contact page offer a
  "Chat on WhatsApp" call-to-action that pre-fills a message referencing the
  product and vehicle, plus a phone-call fallback.
- **Admin console:** A password-protected control center where the owner manages
  shop details (name, phone, WhatsApp number, address, hours, social links),
  categories/subcategories, and products with image uploads — with no developer
  needed for day-to-day operations.

### Target Business

- A boutique or dealership-scale **car accessories / car decor shop**.
- Operator comfort with web tools, without a technical staff.
- Prefers a lightweight, focused solution over a generic e-commerce suite.

### V1 Product Scope

1. Public catalog: categories, subcategories, products, search, filters, sorting,
   pagination, and product detail pages.
2. Product media: a single image per product, uploadable/removable by the owner
   with format and size validation.
3. Shop identity: name, contact details, WhatsApp number, business hours, and
   social links, all editable by the owner.
4. Enquiry funnel: WhatsApp and phone CTAs wired directly to the shop number.
5. Admin console: secure login, dashboard with live catalog counts, product CRUD,
   category/subcategory CRUD, and shop-settings editing.
6. Admin account management: view account, change email, change password, and
   email-based password reset (single-use, hashed reset tokens via Gmail SMTP).

### Intentionally Out of Scope (V1)

These are judged **not part of v1.0.0** and are deliberately excluded:

- Shopping cart, checkout, payments, orders, and inventory/stock quantities.
- Customer accounts, logins, or order history.
- Product reviews, ratings, or comments.
- Multiple images, zoom, or 360-degree product views.
- Full-text search with complex relevance ranking.
- Deployment automation, CI/CD pipelines, and container images.
- Analytics dashboards beyond basic live counts.
- Multi-language / multi-currency support.
- Blog, CMS content pages, or email marketing.

### Customer Journey

1. Land on the home page: hero, value proposition, category tiles, featured
   products, "why choose us", and a contact call-to-action.
2. Browse categories or search products; filter by vehicle, category, or
   availability; sort by newest, price (low/high), or name.
3. Open a product: see photo, price, availability badge, description, and
   compatible vehicles.
4. Tap **Enquire on WhatsApp** (pre-filled product + vehicle message) or call the
   shop directly.
5. Read About / Contact: business hours, address, phone, email, and social links.

### Admin Journey

1. Log in at `/admin/login` (cookie-secured session with CSRF protection).
2. Land on the dashboard with live counts: products, categories, subcategories.
3. Manage products: create, edit, toggle active state, upload/replace/remove the
   product image, set availability, price, and vehicle tags.
4. Manage categories and subcategories with active/inactive flags.
5. Edit shop settings: name, phone, WhatsApp, email, address, business hours,
   social links — changes appear live on the public site.

### Key Business Features

- **Vehicle-focused catalog:** each product can carry vehicle fitment tags
  (e.g. "Alto", "Creta", "Bike — Splendor") used for filtering and shown as
  compatibility badges.
- **Availability that reflects reality:** `IN_STOCK` / `OUT_OF_STOCK` / `ON_ORDER`
  badges on cards and detail pages, so customers see truth instead of an
  always-green "in stock" that hurts trust.
- **Price as an optional money value:** INR prices stored precisely; products can
  show "Contact for price" when the owner chooses not to publish one.
- **WhatsApp-first conversion:** wa.me deep links with pre-filled messages on
  product pages, contact page, and an enquiry CTA — tuned for the Indian
  accessories market.
- **Owner-managed content:** shop contact details, social links, categories,
  products, and photography all editable from the admin console; no code changes.

### V1 Business Philosophy

- **Honest and calm:** truth over hype — real availability, real prices or none.
- **Simple over sprawling:** a focused set of features done well beats a crowded
  dashboard. Preserving a small, clear codebase is an explicit project goal.
- **Security as a baseline, not an afterthought:** Argon2id password hashing,
  signed sessions, CSRF protection, validated image uploads, rate-limited login.
- **Verifiable by tests:** every claim about the API is backed by an automated
  suite (195 backend tests + 289 frontend tests, plus a real-MongoDB smoke run).

---

## 2. Architecture

Single monorepo with two independent applications:

```
┌────────────────────────────┐     ┌─────────────────────────────┐
│  Frontend (React + Vite)   │     │  Backend (FastAPI)          │
│  /products, /admin, ...    │  →  │  /api/* REST + multipart    │
│  ApiClient (credentials)   │  →  │  Services → Repositories    │
│  MSW-tested Vitest suite   │  →  │  MongoDB (PyMongo async)    │
└────────────────────────────┘     │  Storage adapter (local/S3) │
                                   └─────────────────────────────┘
        browser                         http://localhost:5173 → :8000
      .tsx components                  proxied in dev via Vite
```

- **Backend:** FastAPI application factory, Pydantic v2 schemas, repository layer
  over MongoDB, service layer for business rules, storage abstraction for product
  images, dependency-injected settings via `pydantic-settings`.
- **Frontend:** React + Vite + TypeScript SPA, React Router, Tailwind CSS,
  feature-folder structure, centralized `ApiClient` with cookie credentials and
  CSRF header handling.

### Repository Structure

```
car-decor-platform/
├── README.md            # This document (business + technical overview)
├── VERSION.md           # Release/version baseline for the whole platform
├── docs/
│   └── ADMIN_ARCHITECTURE_CONTRACT.md   # Admin frontend/backend contract
├── backend/
│   ├── README.md        # Backend quickstart
│   ├── VERSION.md       # Backend v1.0.0 specifics
│   ├── pyproject.toml   # Dependencies, ruff + pytest configuration
│   ├── .env.example     # All documented environment variables (no secrets)
│   ├── app/
│   │   ├── api/routes/  # auth, catalog, health, products, shop routers
│   │   ├── core/        # config, db, rate_limit, security, slugs, validation
│   │   ├── db/          # indexes, dependencies
│   │   ├── models/      # Pydantic models: product, category, shop, auth, ...
│   │   ├── repositories/# Data access layer (BaseRepository, ProductRepository, ...)
│   │   ├── services/    # Business logic: auth, catalog, products, shop
│   │   ├── storage/     # base/local/S3 adapters + image validation
│   │   └── main.py      # create_app() factory + ASGI entry
│   ├── scripts/seed.py  # Idempotent CLI seed (admin, shop, optional samples)
│   ├── mongo_smoke.py   # Real MongoDB + local storage integration smoke run
│   └── tests/           # pytest suite (mongomock, in-memory storage)
├── frontend/
│   ├── README.md        # Frontend quickstart
│   ├── VERSION.md       # Frontend v1.0.0 specifics
│   ├── package.json
│   ├── vite.config.ts   # Dev proxy /api + /media → :8000
│   └── src/
│       ├── app/router/  # Route table (public + admin)
│       ├── components/  # ui primitives + layout (Header, Footer, Layout)
│       ├── context/     # ShopSettingsContext (public shop info)
│       ├── features/    # admin/, categories/, home/, info/, products/, shop/
│       ├── lib/         # api/client.ts (ApiClient), utils (format, whatsapp)
│       ├── pages/       # Public pages + pages/admin/* admin pages
│       ├── styles/      # Tailwind tokens (index.css)
│       └── types/       # api.ts (shared contracts)
└── storage-local/       # Dev-mode local image storage (ignored by git)
```

---

## 3. Tech Stack

### Backend

| Area                  | Choice |
|-----------------------|--------|
| Language              | Python >= 3.11 |
| Web framework         | FastAPI >= 0.115 |
| Validation/settings   | Pydantic v2, pydantic-settings >= 2.4 |
| Database              | MongoDB via PyMongo >= 4.9 (local dev: `mongodb://localhost:27017`) |
| Auth                  | Argon2id password hashing (argon2-cffi), JWT (PyJWT) in httpOnly cookie |
| Security              | Double-submit CSRF cookie + `X-CSRF-Token` header, login rate limiting |
| Media uploads         | python-multipart, magic-byte image validation, 5 MB cap |
| Dev tooling           | pytest, pytest-asyncio, httpx, mongomock, ruff (lint + format) |
| Optional storage      | Amazon S3 via boto3 (when `STORAGE_MODE=s3`) |

### Frontend

| Area                  | Choice |
|-----------------------|--------|
| Language / build      | TypeScript ~6.0, Vite 8.3 |
| UI framework          | React 19.2, React DOM 19.2 |
| Routing               | react-router-dom 7.18 |
| Styling               | Tailwind CSS 4.3 (via `@tailwindcss/vite`) |
| Icons                 | lucide-react 1.47 |
| Testing               | Vitest 5, jsdom, Testing Library, MSW 2 (mock API), jest-dom |
| Linting / typecheck   | oxlint 1.81, `tsc -b` |

---

## 4. Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+ and npm 10+
- MongoDB (local or any reachable instance); the backend runs without it but
  `/api/health/ready` reports `down` until it is reachable.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env   # edit as needed; keep secrets out of git
python scripts/seed.py --email admin@example.com --password <your-password> --sample
uvicorn app.main:app --reload
```

- API: `http://127.0.0.1:8000/api`
- OpenAPI docs: `http://127.0.0.1:8000/docs`
- Liveness: `GET /api/health` • Readiness: `GET /api/health/ready`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL optional; dev proxies to :8000
npm run dev
```

- Storefront: `http://localhost:5173` (Vite proxies `/api` and `/media` to :8000)
- Admin: `http://localhost:5173/admin`

---

## 5. Environment Configuration Overview

All backend settings are read from the environment or a local `.env` file. See
`backend/.env.example` for the complete, documented list. Highlights:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI`, `MONGO_DB_NAME` | MongoDB connection and database name |
| `JWT_SECRET` | Signing key for sessions; required in production |
| `COOKIE_*`, `CSRF_COOKIE_NAME` | Session/CSRF cookie tuning (secure flag, samesite) |
| `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MINUTES` | Per-IP login throttle |
| `SMTP_*`, `FRONTEND_URL` | Gmail SMTP + storefront origin used for the password-reset email |
| `PASSWORD_RESET_TOKEN_MINUTES`, `FORGOT_PASSWORD_RATE_LIMIT_MAX`, `RESET_PASSWORD_RATE_LIMIT_MAX` | Reset-token lifetime and per-IP activate/reset throttle |
| `STORAGE_MODE` | `local` (default, files served at `/media`) or `s3` (Amazon S3) |
| `AWS_*` | AWS credentials — only needed for `STORAGE_MODE=s3`; never commit |
| `PRODUCT_IMAGE_MAX_BYTES` | Max upload size (default 5 MB) |
| `CORS_ORIGINS` | Comma-separated allowed browser origins |

The frontend uses a single variable: `VITE_API_BASE_URL` (empty means same-origin,
which is correct in dev through the Vite proxy).

**Never commit real secrets.** `.env` files are git-ignored; only `.env.example`
templates are tracked. Do not expose AWS keys or real admin passwords.

---

## 6. Testing and Build

### Backend

```powershell
cd backend
pytest                # 195 tests — API routes, services, repositories, storage, seed
ruff check .          # lint
ruff format --check . # formatting
python mongo_smoke.py # optional: real MongoDB + local storage end-to-end run (68 checks)
```

Verified results for v1.0.0: `pytest` → **195 passed** (6 non-blocking warnings);
`ruff check` → **passed**; `ruff format --check` → **66 files already formatted**;
`mongo_smoke.py` → **68/68 checks passed** against a live MongoDB instance.

### Frontend

```bash
cd frontend
npm run test          # vitest (289 passing + 1 known test-only issue; see Known Issues)
npx tsc -b            # type check
npm run build         # production build → dist/
```

Verified results for v1.0.0: `vitest` → **289 passed / 1 failed** (25 suites);
`tsc -b` → **clean (`exit 0`)**; `npm run build` → **success**.

---

## 7. Version

The project is documented and released as **v1.0.0** (see [VERSION.md](VERSION.md),
[backend/VERSION.md](backend/VERSION.md), [frontend/VERSION.md](frontend/VERSION.md)).

Note: in-code metadata strings (e.g. `APP_VERSION=0.1.0` in `backend/.env.example`
and the version fields in `pyproject.toml` / `package.json`) remain at their
pre-release values in this documentation-only release and are configurable via the
environment. The v1.0.0 label is the documentation/release baseline for the
platform.

---

## 8. Known Issues

- **Frontend, test-only:** `src/features/admin/products/ProductForm.test.tsx` has 1
  failing test (`TypeError: Cannot read properties of undefined (reading '_buffer')`
  — a jsdom FormData / MSW multipart interop limitation with a `waitFor` timeout).
  This is **not** a production bug: product creation/update with image upload is
  verified working end-to-end via `mongo_smoke.py` and in a real browser. See
  `frontend/VERSION.md`.
- **Readiness semantics:** `GET /api/health/ready` returns 503 when MongoDB is
  unreachable — by design, so orchestrators can restart the app.
- **Deprecation warnings:** pytest emits Starlette deprecation warnings about
  `HTTP_413_REQUEST_ENTITY_TOO_LARGE` (6 instances). Cosmetic; planned for cleanup.

---

## 9. Future Development (potential extensions, not v1.0.0)

- Orders & checkout (payments, cart, customer accounts).
- Multi-image galleries and product variants.
- Inventory management with stock-keeping.
- Ratings and reviews.
- Deployment automation, CI/CD, and containerization.
- Analytics dashboards with real usage metrics.

To contribute, work in feature branches, keep the existing tests green, and follow
the update-over-duplication rule for documentation.