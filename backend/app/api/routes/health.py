"""Health and readiness endpoints."""

from fastapi import APIRouter, Response, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.db import mongo

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str
    environment: str


class ReadinessResponse(BaseModel):
    status: str
    database: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe: always succeeds while the process is running."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )


@router.get(
    "/health/ready",
    response_model=ReadinessResponse,
    responses={503: {"description": "A required dependency is unavailable."}},
)
async def readiness(response: Response) -> ReadinessResponse:
    """Readiness probe: reports whether MongoDB is reachable."""
    if await mongo.ping():
        return ReadinessResponse(status="ok", database="up")
    response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(status="degraded", database="down")
