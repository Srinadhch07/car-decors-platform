# Production Configuration

How the Car Decor Platform is configured for a real production deployment, how it
separates development from production, and everything required before going live.

---

## Environment Separation

| | Development | Production |
|---|---|---|
| Backend env file | `backend/.env` (APP_ENV unset or `development`) | `backend/.env.production` (APP_ENV=`production`) OR platform env vars |
| Frontend env file | `frontend/.env` (dev server proxies `/api`, `/media` to :8000) | `frontend/.env.production` (used by `vite build`) |
| MongoDB | `mongodb://localhost:27017` (db `car_decor`) | Production connection string (e.g. MongoDB Atlas) |
| Image storage | `STORAGE_MODE=local` (`storage-local/`, served at `/media`) | `STORAGE_MODE=s3` (Amazon S3 object storage) |
| Cookies | `COOKIE_SECURE=false` (plain HTTP) | `COOKIE_SECURE=true` (HTTPS only) |
| CORS | `http://localhost:5173` | Explicit production frontend origin(s), never `*` |
| Debug | `DEBUG=false` default | `DEBUG` must be `false` |

**Mechanics**

- The backend settings layer (`backend/app/core/config.py`) picks its dotenv file
  from the `APP_ENV` value: `production`/`prod` → `.env.production`, otherwise
  `.env`. Real deployment-platform environment variables always take precedence
  over dotenv files, so hosting providers can inject secrets directly.
- In production the app **refuses to start** if the configuration is unsafe. See
  the Backend section below for the exact guardrails.
- The Vite build (`vite build`) runs in production mode by default and consumes
  `frontend/.env.production`. Vite only inlines variables prefixed `VITE_`.

**Never commit real secrets.** All `.env*` files except `.env.example` are
git-ignored. The repo only tracks placeholder templates:
`backend/.env.example`, `frontend/.env.example`, and the (also ignored)
`backend/.env.production` and `frontend/.env.production` local templates.

---

## Backend

### API configuration

- Uvicorn/FastAPI app served from `backend` (`uvicorn app.main:app`).
- `API_PREFIX=/api`: health, readiness, auth, shop, catalog, and product routes.
- `APP_VERSION` — set the deployed version (v1.0.0) in production.
- `LOG_LEVEL` — `WARNING` recommended in production; the app never logs secrets
  (passwords, JWTs, cookies, API keys, or storage/database credentials are never
  written to logs).

### MongoDB

- `MONGO_URI` — the production connection string. Never point this at localhost
  in production.
- `MONGO_DB_NAME` — a dedicated production database (e.g. `car_decor_production`).
- `MONGO_TIMEOUT_MS=3000` — server selection timeout.
- The app connects at startup and **ensures required indexes** automatically;
  it logs (does not crash) if MongoDB is temporarily unreachable so liveness
  checks keep working.

### Authentication

- Admin login at `POST /api/admin/auth/login` returns a JWT in an httpOnly cookie
  (`car_decor_session`) plus a readable CSRF cookie (`car_decor_csrf`).
- `JWT_SECRET` — required in production; the app **refuses to start** without it
  (sessions would otherwise be signed with an ephemeral random secret that dies on
  restart). Generate: `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- `JWT_ACCESS_MINUTES=30` — session lifetime.
- `LOGIN_RATE_LIMIT_MAX=5` per `LOGIN_RATE_LIMIT_WINDOW_MINUTES=15` per client IP.
  The limiter is in-memory per process — fine for a single-node deployment;
  a distributed limiter is an optional future improvement.

### Cookies

| Setting | Production value | Why |
|---|---|---|
| `COOKIE_SECURE` | `true` | Required; app refuses to start otherwise. Session/CSRF cookies only sent over HTTPS. |
| `COOKIE_SAMESITE` | `lax` | Prevents CSRF from cross-site sub-requests while preserving login flow. |
| `COOKIE_DOMAIN` | `""` (unset) | Leave unset unless frontend+API share a parent domain and you want cookies on both hosts. |
| HttpOnly | always on for session cookie | The session cookie cannot be read by JS. The CSRF cookie is readable by design (double-submit). |

### CSRF

- Double-submit pattern: the browser echoes the `car_decor_csrf` cookie value in an
  `X-CSRF-Token` header for every state-changing request.
- The frontend `ApiClient` does this automatically (`credentials: "include"` +
  header). No production change needed beyond HTTPS + `SameSite=Lax` + `Secure`.

### CORS

- `CORS_ORIGINS` must list the **exact** production frontend origin(s),
  comma-separated (e.g. `https://car-decor.example.com`).
- Wildcard `*` is rejected by config validation because credentialed
  (cookie-based) requests require explicit origins. `allow_credentials=True`.
- If frontend and backend share one origin behind a reverse proxy, CORS is
  effectively unnecessary but the app stays configured with the explicit origin.

### Storage

- `STORAGE_MODE=s3` in production (Amazon S3 object storage). The local
  development adapter (`STORAGE_MODE=local`) must **not** be used in production
  unless you deliberately run everything on a single combined node — which is not
  the recommended deployment architecture.
- S3 requires `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
  `AWS_S3_BUCKET`. IAM credentials need `s3:PutObject`, `s3:DeleteObject`,
  `s3:HeadObject`, and — when `AWS_S3_PUBLIC_URL` is empty — public-read bucket
  access so the generated `https://<bucket>.s3.<region>.amazonaws.com/<key>`
  URLs are fetchable by anonymous customers.
- `AWS_S3_PUBLIC_URL` (optional): a public CDN/static prefix in front of the
  bucket; when empty, the standard virtual-hosted S3 URL is used.
- Product images are stored under `products/<uuid>.<ext>` keys; the database only
  stores the `image_url`, so a migration/export is simple.

### Logging

- Configured once at startup from `LOG_LEVEL`. No passwords, JWTs, cookies,
  tokens, or credentials are ever logged. Connection failures are logged at
  `WARNING`. Set `LOG_LEVEL=WARNING` (or `INFO` if you need route detail).

---

## Frontend

### API URL

- `VITE_API_BASE_URL` in `frontend/.env.production`:
  - **Empty (recommended):** the built SPA is served from the same origin as the
    API (e.g. Nginx serves `dist/` and reverse-proxies `/api` and `/media` to the
    backend). No CORS, cookies stay same-origin, HTTPS applies to everything.
  - **Set (e.g. `https://api.car-decor.example.com`):** frontend and backend on
    different origins. Cookies then depend on `Secure` + `SameSite` and the
    backend `CORS_ORIGINS` must include the frontend origin.
- The frontend defaults `VITE_API_BASE_URL` to `""` (same-origin) when unset, so
  no localhost dev URL leaks into a production build.

### Vite environment variables

- Vite inlines only `VITE_`-prefixed variables at build time. They end up in the
  public bundle, so **never** put secrets here.
- `frontend/.env.production` is loaded by `vite build` (production mode).

### Build configuration

- `npm run build` runs `tsc -b && vite build` → static output in `frontend/dist/`.
- No source maps are configured for production builds.
- No hardcoded API URLs: the only API address comes from `VITE_API_BASE_URL`.

### Routing

The SPA uses client-side routing (React Router `createBrowserRouter`). In
production the static file server must return `index.html` for unknown paths
(SPA fallback) while still serving real assets and `/api`/`/media` correctly.

Customer routes: `/`, `/products`, `/products/:slug`, `/categories/:slug`,
`/about`, `/contact`.
Admin routes: `/admin/login`, `/admin` (dashboard), `/admin/products`,
`/admin/products/new`, `/admin/products/:productId/edit`, `/admin/categories`,
`/admin/subcategories`, `/admin/shop`.

Example Nginx `location` blocks:

```nginx
location /api/ { proxy_pass http://backend:8000; }
location /media/ { proxy_pass http://backend:8000; }
location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

---

## Required Production Environment Variables

Variable names only — values are injected at deploy time, never stored in the repo.

Backend:

```
APP_ENV=production
APP_VERSION=1.0.0
DEBUG=false
LOG_LEVEL=WARNING
MONGO_URI=
MONGO_DB_NAME=
CORS_ORIGINS=
JWT_SECRET=
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
STORAGE_MODE=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=
AWS_S3_PUBLIC_URL=        (optional; empty uses the standard S3 URL)
SEED_ADMIN_EMAIL=         (manual seed step only)
SEED_ADMIN_PASSWORD_HASH= (manual seed step only; prefer a hash over plaintext)
```

Frontend (`frontend/.env.production`, build-time):

```
VITE_API_BASE_URL=        (empty = same-origin, or full backend URL)
```

---

## Deployment Checklist

- [ ] Production database configured (MongoDB URI + dedicated database name)
- [ ] Production secrets configured (`JWT_SECRET`, AWS keys) via platform env vars
- [ ] Production storage configured (`STORAGE_MODE=s3` + AWS/S3 vars)
- [ ] Backend URL configured
- [ ] Frontend API URL configured (`VITE_API_BASE_URL` or same-origin proxy)
- [ ] CORS configured (explicit origins, no wildcard)
- [ ] HTTPS configured (reverse proxy + certificate)
- [ ] Secure cookies configured (`COOKIE_SECURE=true`)
- [ ] Debug disabled (`DEBUG=false`)
- [ ] No secrets committed (git-ignored `.env*`, only `.env.example` tracked)
- [ ] Production build passes (`npm run build`)
- [ ] Health check passes (`GET /api/health` → 200)
- [ ] Readiness check passes (`GET /api/health/ready` → 200 when DB reachable)
- [ ] SPA fallback configured for client-side routes (nginx `try_files`)

---

## Seeding / Admin Account Creation (safe, manual)

- Seeding is a **manual CLI step only** — never run `scripts/seed.py` against
  production automatically via the app startup path.
- Create the production admin explicitly:
  `python scripts/seed.py --email <admin@yourdomain.com> --password-hash <argon2-hash>`
  (prefer a pre-computed Argon2 hash over a plaintext `--password`).
- Sample data (`--sample`) is for development; do not run it against production.

---

## Notes & Assumptions

- Deployment is **not executed** by this task — this document prepares and
  validates configuration only.
- Single-node backend assumption: the login rate limiter is in-memory. Use one
  app instance (or add a shared limiter) if you run multiple replicas.
- Backend and frontend are separate deployables; an HTTPS reverse proxy in front
  of the backend serves `dist/` and forwards `/api` + `/media`.