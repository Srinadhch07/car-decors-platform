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
  `api/routes/` → `services/` → `repositories/` → MongoDB; models in `models/`,
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
