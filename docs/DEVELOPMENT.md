# DEVELOPMENT.md — Local setup, commands, testing

Windows PowerShell. Run backend commands from the repo root (or `backend\`); run
frontend commands from `frontend\`.

## Prerequisites
- Python >= 3.11 with the backend venv at `backend\.venv\`.
- Node.js + npm.
- MongoDB running locally (`mongodb://localhost:27017`) for real runs. Tests use
  mongomock and need no database.

## First-time setup
```powershell
# Backend
backend\.venv\Scripts\python.exe -m pip install -e backend[dev]

# Frontend
npm install --prefix frontend
```
Copy `backend\.env.example` → `backend\.env` and set real values (JWT secret, mail,
etc.). Never commit `.env`. Frontend needs no `.env` for local dev.

## Run
```powershell
# API (:8000) — from backend\
..\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload

# SPA (:5173) — from frontend\
npm run dev            # proxies /api and /media to http://localhost:8000
```
Seed the admin + sample data (safe to re-run):
```powershell
backend\.venv\Scripts\python.exe backend\scripts\seed.py --email admin@example.com --password <password> --sample
```

## Test / lint / typecheck
```powershell
# Backend
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
backend\.venv\Scripts\python.exe -m ruff check backend\app backend\tests

# Frontend (from frontend\)
npm run test           # vitest run
npm run lint           # oxlint
npx tsc -b             # typecheck
npm run build          # tsc -b && vite build
```
Use the venv interpreter; a system Python may lack test deps (mongomock).

Last verified results: backend **371 passed**, ruff clean; frontend **536/537**
(1 known pre-existing `ProductForm.test.tsx` failure — jsdom/vitest `_buffer`
interop, test-only), oxlint clean, `tsc -b` clean, build OK.
Do not weaken tests to hide failures; report pre-existing ones as-is.

### Branding & canonical domain
- Business name: **Venkata Ramana Real Value Car Decors** (used in `SITE_URL`, `FALLBACK_BRAND`, index.html, AboutSection).
- Canonical domain: **https://vrcardecors.in/** — configured in SEO/sitemap/robots/favicon. **Not live/verified.**
- Favicon: animated SVG (`favicon.svg`), static fallback (`favicon-static.svg`), integrated in `index.html`.
- When running locally, the dev origin is `http://localhost:5173`; SEO helpers use the production origin for absolute URLs.

## Tests layout
- Backend: `backend/tests/` with `conftest.py` providing mongomock DB, httpx
  `ASGITransport` client, fake in-memory storage, and a recording email service
  (`tests/support/`). No network or real Mongo.
- Frontend: colocated `src/**/*.test.{tsx,ts}`, run in jsdom; MSW for HTTP,
  helpers in `src/test-utils.tsx`, setup in `src/test-setup.ts`.

## Deployment (see PRODUCTION_CONFIGURATION.md)
- Backend behind an ASGI server, `APP_ENV=production`, `COOKIE_SECURE=true`,
  strong `JWT_SECRET`, restricted `CORS_ORIGINS`, real `MONGO_URI`, SMTP configured,
  and S3 storage if not using a persistent local volume.
- Frontend: `npm run build` → `dist/` served as static files; the SPA calls the API
  same-origin (or via `VITE_API_BASE_URL`). Ensure `/api` and `/media` reach the backend.
- `/health` = liveness, `/health/ready` = readiness (503 when Mongo is down).
