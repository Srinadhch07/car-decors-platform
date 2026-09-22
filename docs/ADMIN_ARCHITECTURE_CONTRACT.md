# ADMIN ARCHITECTURE CONTRACT â€” Car Decor Platform (B6.7)

**Owner:** Lead Agent (single writer of all shared seams).
**Status:** Frozen â€” sub-agents implement against this ONLY; do not edit.

---

## 1. Mission
Build **Admin V1** â€” the operations console for the Car Decor Platform shop owner â€”
wired to the existing FastAPI + real-MongoDB backend via the existing `ApiClient`.
Three feature agents implement in parallel; an integration agent verifies actual
code; the Lead owns every shared contract file.

## 2. Non-negotiable scope boundaries
- **NO backend modifications.** Reuse existing admin endpoints verbatim.
- **NO customer-UI redesign.** Admin is additive, under its own route prefix.
- **NO new storage/image backend.** Reuse the existing multipart image contract
  (jpeg/png/webp, <=5 MB, magic-byte sniffed, `image_url` returned by API).
- **NO commits / pushes / PRs.**
- **NO weakening of existing tests.** Every existing suite stays green.
- Do NOT claim PASS without real verification.

## 3. Hard rules for agents
1. ONLY create files under your owned paths (table below). Never create/overwrite
   a file you do not own.
2. You MAY READ any file. `/admin` wiring (router), `api/client.ts`,
   `types/api.ts`, `styles/index.css`, `test-utils.tsx` are **Lead-owned**: do NOT
   write them; report "shared-file request" entries instead (Integration applies).
3. Reuse the existing design tokens (`--color-*`, `--font-*`, radius, shadow) and
   existing `ui/*` primitives via Tailwind classes from `styles/index.css`. Do not add
   new design tokens unless you report it and Integration merges it.
4. Follow the established test pattern: `vitest` + RTL + MSW (`setupServer`),
   `TestWrapper`/`createMockState`/`mockShopSettings` from `test-utils`, per-file
   `server` from `src/test-setup.ts`-registered MSW handlers. Never rely on the real
   backend inside unit tests.
5. Accessibility: focus-visible outlines, semantic labels, `aria-*` for icon-only
   controls, keyboard reachable. Conformance target WCAG 2.1 AA.
6. All network paths the frontend uses must come from `types/api` contracts; do not
   invent field names.

## 4. Verification gates (each agent, before handoff)
- `npx vitest run` your owned test files â†’ all pass
- `npx tsc --noEmit` â†’ clean
- `npm run lint` (oxlint) â†’ no errors introduced (pre-existing warnings in
  `ProductsPage.test.tsx` are known; do not touch that file)
- `npx vite build` â†’ success (build is green today: 390.04 kB JS)

Report exact numbers for each.

## 5. Backend contract (FIXED â€” do not guess)

### Auth (prefix `/api`), cookie-based
- `POST /api/admin/auth/login` JSON `{email,password}` â†’
  sets `car_decor_session` (httpOnly) + `car_decor_csrf` (readable) cookies.
  Success 200 `AdminUserRead {id,email}`; failure 401; rate-limited 429.
- `GET /api/admin/auth/me` â†’ 200 `AdminUserRead` or 401 (no/invalid cookie).
- `POST /api/admin/auth/logout` â†’ 204, clears cookies (requires CSRF).
- CSRF: every non-GET admin request must send cookie `car_decor_csrf` value in
  header `X-CSRF-Token`.

### Shop settings
- `GET /api/admin/shop` â†’ `ShopSettingsPublic`.
- `PUT /api/admin/shop` JSON partial â†’ `ShopSettingsPublic`.
  Optional fields may be set to `null` to clear. `social_links` keys restricted to
  {instagram, facebook, twitter, youtube, linkedin, telegram, whatsapp, website}.
- Public `GET /api/shop` (no auth) is what the storefront uses.

### Catalog
- Categories: `GET /api/admin/categories`; `POST` (name required, `slug` optional â†’
  slugs kept stable on rename unless provided explicitly); `PUT/{category_id}`
  partial; `DELETE/{category_id}` â†’ 204, blocked (409) if subcategories exist.
- Subcategories: `GET`; `POST` (needs `category_id`, name required); `PUT`; `DELETE`
  â†’ blocked (409) if products reference it.
- Public catalog reads (`/api/categories`, `/api/categories/{slug}/subcategories`) are
  the sl-order base; admin flips `is_active`.

### Products
- `GET /api/admin/products?page&page_size&search&category&sort&availability&vehicle`
  â†’ `ProductListPage`.
- `POST /api/admin/products` (multipart form: `name`, `category_id`, optional
  `subcategory_id`, `description`, `price`, `availability`, `is_active`,
  `vehicle_tags` JSON, optional `image` file).
- `PUT /api/admin/products/{product_id}` multipart partial (+optional `image` replace),
  `clear_fields` = comma list of `price|subcategory_id|...` to null out.
- `DELETE /api/admin/products/{product_id}` â†’ 204.
- Read model matches public `Product`; `price` is `string|null`, `availability` one of
  `IN_STOCK|OUT_OF_STOCK|ON_ORDER`, `vehicle_tags: string[]`, `image_url: string|null`.

### Common success/error envelope
- `ApiClient.request` already maps non-ok to `ApiRequestError{status,message}`,
  2xx-json â†’ typed body, 204 â†’ `undefined`. Reuse; do not fork.

## 6. File ownership (single writer per row)

| Path (frontend/src) | Owner |
|---|---|
| `router/index.tsx` (add admin routes when pages exist) | **LEAD/Integration** |
| `lib/api/client.ts` (`credentials:"include"` + admin methods + CSRF header) | **LEAD** |
| `types/api.ts` (admin types: `AdminUserRead`, `ShopSettingsUpdate`, admin Create/Update payloads) | **LEAD** |
| `test-utils.tsx`, `test-setup.ts` (admin-safe wrapper/MSW) | **LEAD** |
| `styles/index.css` | **LEAD** |
| `features/admin/auth/*` + `pages/admin/auth/*` + `features/admin/shell/*` + `pages/admin/dashboard/*` | **AGENT 1** |
| `features/admin/shop/*` + `pages/admin/shop/*` | **AGENT 2** |
| `features/admin/catalog/*` (categories+subcategories) + `pages/admin/catalog/*` | **AGENT 2** |
| `features/admin/products/*` + `features/admin/images/*` + `pages/admin/products/*` | **AGENT 3** |

### Routing/export contract (Lead predefines; agents must export these)
Router adds anonymous `/admin/login` and a guarded shell `/admin` containing
lazy children for the three page roots. Site exports the page roots from
**component files** at these exact default-export paths (agents create them):

- `features/admin/auth/LoginPage.tsx` â†’ default export `LoginPage`
- `features/admin/shell/AdminShell.tsx` â†’ default export `AdminShell` (contains nav,
  outlet, logout, session guard wiring via `useAdminSession`)
- `features/admin/shop/ShopAdminPage.tsx` â†’ default `ShopAdminPage`
- `features/admin/catalog/CatalogAdminPage.tsx` â†’ default `CatalogAdminPage`
- `features/admin/products/ProductsAdminPage.tsx` â†’ default `ProductsAdminPage`

### Cross-agent seams (imports to follow, NOT to create)
- `useAdminSession()` from `features/admin/auth/useAdminSession.ts` (Agent 1).
  Shape returned to Lead: `{ isAuthed, admin, loading, login(email,pwd), logout() }`.
- `useShopSettings()` and `ShopSettingsContext` from `context/ShopSettingsContext.tsx`
  (EXISTS â€” read it; do not recreate).
- `useApi` + api methods from `lib/api` (EXISTS). Wait for Lead's expanded `client.ts`.

> **Sequencing note:** Lead pre-publishes the expanded `client.ts` + admin types +
> admin-safe test-utils BEFORE agents run, so Agent 2/3 never block on Agent 1.

## 7. Agent deliverables
Each agent ends with a structured handoff: files created, files intentionally NOT
created/owned, APIs/endpoints used, components created, tests added, tests passed,
`tsc`/lint/build results, assumptions, risks, and any shared-file requests.

## 8. Definition of done (admin)
1. Login flow works against real backend (real `car_decor_session` cookie) â€” verified
   by Integration via live FastAPI+MongoDB.
2. Shop+catalog CRUD works against real backend.
3. Product CRUD + image upload/replace/delete works against real backend (real image
   file writes to storage, real `/media` URL rendered).
4. All 3 agent suites + the existing 174 tests + InfoPages + unit tests are green;
   `tsc`, `lint`, `vite build` clean.
5. Word "PASS" only after independent QA confirms. Reports A (product) + B (experiment).


## 12. Backend contract (VERIFIED from backend source — do not guess)

All routes mounted under `/api`. Session = JWT in httpOnly cookie `car_decor_session`;
separate readable cookie `car_decor_csrf`. Every non-GET admin request must send
header `X-CSRF-Token` == value of cookie `car_decor_csrf`. All admin requests must
send cookies (`credentials: "include"`); the Vite dev proxy forwards `/api` to
`http://localhost:8000` and cookies are same-origin through the proxy.

### Auth
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| POST | `/admin/auth/login` | `{"email","password"}` | 200 `AdminUserRead{id,email}`; sets both cookies | 401 invalid, 429 rate-limited |
| GET | `/admin/auth/me` | — | 200 `AdminUserRead` | 401 |
| POST | `/admin/auth/logout` | — (csrf) | 204 | 401 |

### Shop settings
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/admin/shop` | — | 200 `ShopSettingsPublic` | 404 |
| PUT | `/admin/shop` | `ShopSettingsUpdate` (all optional; null clears) | 200 `ShopSettingsPublic` | 409/422 |
| GET | `/shop` | — | 200 `ShopSettingsPublic` | 404 |

`ShopSettingsPublic` = `{shop_name(required), whatsapp_number, phone, email,
address, business_hours, social_links{instagram|facebook|twitter|youtube|linkedin|
telegram|whatsapp|website?url}, logo_url}`. Admin shop settings + public shop both
share this shape.

### Categories (admin)
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/admin/categories` | — | 200 `list[CategoryRead]` | — |
| POST | `/admin/categories` | `CategoryCreate` | 201 `CategoryRead` | 409 slug conflict, 422 |
| GET | `/admin/categories/{id}` | — | 200 `CategoryRead` | 404 |
| PUT | `/admin/categories/{id}` | `CategoryUpdate` | 200 `CategoryRead` | 409/404/422 |
| DELETE | `/admin/categories/{id}` | — (csrf) | 204 | 409 if subcategories exist, 404 |

### Subcategories (admin; nested under a category)
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/admin/subcategories` | — | 200 `list[SubcategoryRead]` | — |
| POST | `/admin/subcategories` | `SubcategoryCreate` (category_id required) | 201 | 409/422/404 |
| GET | `/admin/subcategories/{id}` | — | 200 | 404 |
| PUT | `/admin/subcategories/{id}` | `SubcategoryUpdate` | 200 | 409/404/422 |
| DELETE | `/admin/subcategories/{id}` | — (csrf) | 204 | 409 if products reference, 404 |

### Products (admin)
| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/admin/products` | query: page,page_size,search,category,subcategory,availability,is_active,sort | 200 `ProductListPage` | 422 invalid query |
| POST | `/admin/products` | multipart form (`name`, `category_id`, `subcategory_id?`, `description?`, `price?`, `availability`, `is_active`, `vehicle_tags` JSON string, optional `image` file) | 201 `ProductRead` | 409/413 image/422 |
| GET | `/admin/products/{id}` | — | 200 `ProductRead` | 404 |
| PUT | `/admin/products/{id}` | multipart partial; `clear_fields` CSV of `price|subcategory_id|...`; optional `image` replaces+deletes old | 200 `ProductRead` | 409/413/422 |
| DELETE | `/admin/products/{id}` | — (csrf) | 204 | 404 |

`ProductRead` = `{id, category_id, subcategory_id?, name, slug, description,
price: Money? (string|null), availability: IN_STOCK|OUT_OF_STOCK|ON_ORDER,
is_active, vehicle_tags: string[], image_url: string|null, created_at, updated_at}`.
`ProductListPage` = `{items, page, page_size, total, total_pages}`.

### Image upload (storage adapter, existing)
- `PUT /admin/products/{id}` and multipart `POST /admin/products` accept an optional
  `image` file. Allowed: image/jpeg, image/png, image/webp; signature-sniffed
  (magic bytes); <= 5 MB (413 too large); extension must match content type.
- THROTTLING + validation live 100% in the existing backend; do not reimplement.
- Public path returned is `image_url` (e.g. `/media/<key>`); frontend only renders it.

### Vehicle tags field name (CRITICAL)
The multipart field sent by the frontend MUST be named `vehicle_tags` (JSON array
string). The oldest public API used `vehicle_tags`; the admin create/update
contract uses `vehicle_tags`. Do not rename.

## 13. Seed/admin bootstrap (real-login QA)
The repo seed CLI (`backend/scripts/seed.py` / `python -m app.seed`) creates the
admin account, shop settings, categories, subcategories, and sample products —
guaranteed idempotent. The running DB already contains 2 admins, 1 shop settings,
2 categories, 3 subcategories, 3 products. For real-login QA, the Integration
agent provisions a KNOWN dev credential via the EXISTING seed CLI (no backend code
change) when the current admin password is unknown, then documents it.
