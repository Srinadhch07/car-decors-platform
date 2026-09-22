# Car Decor Platform — Frontend

React + Vite + TypeScript customer-facing frontend for the car decor/accessories platform.

## Requirements

- Node.js 20+
- npm 10+

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

## Development

```bash
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` and `/media` requests to the FastAPI backend at `http://localhost:8000`.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Lint & Type Check

```bash
npm run lint       # oxlint
npx tsc -b         # TypeScript compiler
```

## Project Structure

```
src/
├── app/              # App entry, router, providers
│   ├── router/       # React Router configuration
│   └── App.tsx       # Root component
├── components/
│   ├── ui/           # Reusable primitives (Button, Badge, etc.)
│   └── layout/       # Header, Footer, Layout
├── features/         # Feature-specific components (future)
│   ├── shop/
│   ├── categories/
│   └── products/
├── pages/            # Route page components
├── hooks/            # Custom React hooks
├── lib/
│   ├── api/          # API client
│   └── utils/        # Utility functions
├── types/            # TypeScript type definitions
├── styles/           # Global CSS and Tailwind config
└── main.tsx          # Entry point
```

## API

The frontend communicates with the FastAPI backend. The base URL is configured via the `VITE_API_BASE_URL` environment variable.

**Public endpoints consumed:**

| Endpoint | Purpose |
|---|---|
| `GET /api/shop` | Shop settings and contact info |
| `GET /api/categories` | Active categories |
| `GET /api/categories/{slug}` | Single category |
| `GET /api/categories/{slug}/subcategories` | Category subcategories |
| `GET /api/products` | Product listing with search/filter/pagination |
| `GET /api/products/{slug}` | Single product detail |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5173` | Backend API base URL (proxied in dev) |
