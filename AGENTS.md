# AGENTS.md — Guide for AI coding agents

Car Decor Platform: a public storefront (React SPA) plus a private admin console,
backed by a FastAPI + MongoDB API. See `README.md` for business/technical overview
and `docs/PROJECT_CONTEXT.md` for the deeper map.

## Read first
- `docs/PROJECT_CONTEXT.md` — architecture, data models, API contract, env vars.
- `docs/DEVELOPMENT.md` — local setup, commands, testing, deployment.
- `backend/README.md`, `frontend/README.md`, `PRODUCTION_CONFIGURATION.md`, `VERSION.md`.

## Layout
- `backend/` FastAPI app (`backend/app/main.py`), tests in `backend/tests/`.
  `api/routes/` -> `services/` -> `repositories/` -> MongoDB; models in `models/`,
  config in `core/config.py`, indexes in `db/indexes.py`.
- `frontend/` React + Vite SPA. `src/features/*` (feature modules),
  `src/components/*`, `src/pages/*`, `src/app/router/index.tsx`, shared API
  client `src/lib/api/client.ts`, shared types `src/types/api.ts`.
- `storage-local/` local uploads (git-ignored). `docs/` project docs.

## Development
- Use PowerShell. Backend venv: `backend\.venv\Scripts\python.exe`.
- Run API (from `backend\`): `..\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload`
- Run SPA (from `frontend\`): `npm run dev` (proxies `/api` + `/media` to `:8000`).
- Backend tests: `backend\.venv\Scripts\python.exe -m pytest backend\tests -q`
- Backend lint: `backend\.venv\Scripts\python.exe -m ruff check backend\app backend\tests`
- Frontend: `npm run test`, `npm run lint`, `npx tsc -b`, `npm run build`.

## Rules (must follow)
- Inspect existing code and `git status` before editing. Do not modify unrelated files.
- Preserve existing behavior and uncommitted work. Never run `git reset --hard`,
  `git clean`, or discard/stash changes you did not create.
- Protect secrets: never commit `.env*` (only `.env.example`), never print or log tokens,
  passwords, JWT secrets, or credentials. Use placeholders in docs.
- Backend layering: keep routers thin; business rules in `services/`; all Mongo access in
  `repositories/`; validate/raise domain errors, map to HTTP in routes.
- Money is BSON `Decimal128` (serialized as string), never float. Datetimes are naive UTC.
- Frontend: give every new feature a folder under `src/features/` with colocated
  `*.test.tsx`; go through `ApiClient`; never use `dangerouslySetInnerHTML`.
- Add/adjust tests with every change. Run the relevant tests + lint/typecheck and report
  the exact results, including any pre-existing failures (there is 1 known frontend failure).
- Do not claim a suite passes when it does not. Do not commit unless explicitly asked.

## Brand & canonical domain
- Business name: **Venkata Ramana Real Value Car Decors** (not "SLG" or previous names).
- Intended canonical origin: **https://vrcardecors.in/** -- used in SEO, sitemap, robots.txt,
  Open Graph, Twitter, structured data, favicon declarations. **Domain is not live/verified.**
- Reuse shop settings (`shop_name`, contact info, social links) as the single source of truth.
- Do not hardcode the brand name in new components; read from `useShopSettings()` or `FALLBACK_BRAND`.

## Favicon
- Animated: `frontend/public/favicon.svg` (SMIL animation, prefers-reduced-motion respected).
- Static fallback: `frontend/public/favicon-static.svg`.
- Both declared in `frontend/index.html`; no ICO/PNG required for modern browsers.

## SEO / structured data
- `frontend/src/lib/seo.ts` exports `SITE_URL`, `FALLBACK_BRAND`, `applySeo()`, `buildBreadcrumbs()`.
- Every public page renders `<SeoHead data={...} />` with unique `title`, `description`,
  `canonicalPath`, `ogImage`, `siteName`, and `jsonLd` (WebSite, Product, BreadcrumbList).
- Admin/auth/404 pages call `blockIndexing()` (noindex, nofollow, clears OG/Twitter/JSON-LD).
- Sitemap at `/sitemap.xml` (served by backend `seo.py`); uses `frontend_url` setting.
- Robots.txt at `/robots.txt` (static file in `frontend/public/`); references sitemap.

## Verification checklist
Before reporting success, run from `frontend/`: `npx tsc -b`, `npm run lint`, `npm run test`,
`npm run build`. From `backend/`: `ruff check app tests`, `pytest tests -q`.
Report exact counts; note the 1 pre-existing frontend failure separately.
