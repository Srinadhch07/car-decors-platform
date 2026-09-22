"""Shared pytest fixtures."""

from collections.abc import AsyncIterator

import mongomock
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.dependencies import get_database
from app.main import create_app
from app.models.admin_user import AdminUser
from app.repositories.admin_users import AdminUserRepository
from tests.support.fake_storage import MemoStorage
from tests.support.mongomock_async import AsyncDatabase


@pytest.fixture
def app():
    """Return a fresh application instance for testing."""
    return create_app()


@pytest.fixture
def fake_db() -> AsyncDatabase:
    """Return an isolated, in-memory database for a single test.

    mongomock is used so tests never depend on a locally running MongoDB.
    """
    return AsyncDatabase(mongomock.MongoClient()["test_car_decor"])


@pytest.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    """Return an HTTP client bound to the app via ASGI transport.

    The lifespan is intentionally not executed so tests remain independent of
    an external MongoDB instance.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest.fixture
async def seeded_admin(fake_db: AsyncDatabase) -> AdminUser:
    """Return an admin account in the fake database with a known password."""
    repository = AdminUserRepository(fake_db)
    return await repository.create(
        AdminUser(
            email="admin@example.com",
            password_hash=hash_password("correct-horse-battery"),
        )
    )


@pytest.fixture
async def auth_client(fake_db: AsyncDatabase) -> AsyncIterator[AsyncClient]:
    """Return a client bound to a fresh app wired to the fake database.

    A fresh app instance also means a fresh login rate limiter, isolating rate
    limit state between tests.
    """
    test_app = create_app()
    test_app.dependency_overrides[get_database] = lambda: fake_db
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest.fixture
async def authed_headers(auth_client: AsyncClient, seeded_admin) -> dict[str, str]:
    """Log in as the seeded admin and return CSRF headers for mutations."""
    response = await auth_client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 200
    csrf = auth_client.cookies.get(get_settings().csrf_cookie_name) or ""
    return {"X-CSRF-Token": csrf}


@pytest.fixture
async def product_client(
    fake_db: AsyncDatabase,
) -> AsyncIterator[tuple[AsyncClient, MemoStorage]]:
    """Return a client wired to the fake database and a fake storage backend."""
    test_app = create_app()
    test_app.dependency_overrides[get_database] = lambda: fake_db
    storage = MemoStorage()
    test_app.state.storage = storage
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client, storage


async def login_headers(client: AsyncClient) -> dict[str, str]:
    """Log in as the seeded admin account on ``client``."""
    response = await client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 200
    csrf = client.cookies.get(get_settings().csrf_cookie_name) or ""
    return {"X-CSRF-Token": csrf}
