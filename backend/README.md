# Car Decor Platform — Backend

FastAPI backend for the car decor/accessories platform. Stage **B0** provides
only the application skeleton: configuration, MongoDB connection lifecycle,
CORS, health/readiness endpoints, and test/lint tooling.

## Requirements

- Python 3.11+
- MongoDB (optional for B0; required for readiness to report `up`)

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

## Run

```powershell
uvicorn app.main:app --reload
```

- Liveness: `GET http://127.0.0.1:8000/api/health`
- Readiness: `GET http://127.0.0.1:8000/api/health/ready`
- OpenAPI docs: `http://127.0.0.1:8000/docs`

## Test and lint

```powershell
pytest
ruff check .
ruff format --check .
```

## Configuration

Settings are read from environment variables or a local `.env` file
(see `.env.example`). No deployment-specific values are hard-coded; CORS
origins, MongoDB URI, and application metadata are all injected via the
environment.
