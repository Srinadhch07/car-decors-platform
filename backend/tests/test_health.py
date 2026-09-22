"""Tests for the health and readiness endpoints."""

from httpx import AsyncClient


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["app"]
    assert body["version"]
    assert body["environment"]


async def test_readiness_without_database_is_degraded(client: AsyncClient) -> None:
    response = await client.get("/api/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["database"] == "down"


async def test_unknown_route_returns_404(client: AsyncClient) -> None:
    response = await client.get("/api/does-not-exist")

    assert response.status_code == 404
