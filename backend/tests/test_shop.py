"""Tests for shop settings: public view, admin management, and singleton rules."""

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.models.shop_settings import ShopSettings
from app.repositories.shop_settings import ShopSettingsRepository
from app.seed import seed_shop_settings
from tests.support.mongomock_async import AsyncDatabase

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "correct-horse-battery"
SHOP_URL = "/api/shop"
ADMIN_SHOP_URL = "/api/admin/shop"
LOGIN_URL = "/api/admin/auth/login"

PUBLIC_FIELDS = {
    "shop_name",
    "whatsapp_number",
    "phone",
    "email",
    "address",
    "business_hours",
    "social_links",
    "logo_url",
}


async def _seed_default_shop(fake_db: AsyncDatabase) -> None:
    await seed_shop_settings(fake_db, ShopSettings(shop_name="Car Decor Shop"))


async def _login(admin_client: AsyncClient) -> dict[str, str]:
    response = await admin_client.post(
        LOGIN_URL, json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    csrf = admin_client.cookies.get(get_settings().csrf_cookie_name) or ""
    return {"X-CSRF-Token": csrf}


async def test_public_shop_returns_settings(auth_client: AsyncClient, fake_db) -> None:
    await _seed_default_shop(fake_db)

    response = await auth_client.get(SHOP_URL)

    assert response.status_code == 200
    assert response.json()["shop_name"] == "Car Decor Shop"


async def test_public_shop_404_when_not_configured(auth_client: AsyncClient) -> None:
    response = await auth_client.get(SHOP_URL)

    assert response.status_code == 404
    assert response.json() == {"detail": "Shop settings not configured"}


async def test_public_response_exposes_only_public_fields(
    auth_client: AsyncClient, fake_db
) -> None:
    await _seed_default_shop(fake_db)

    response = await auth_client.get(SHOP_URL)

    assert response.status_code == 200
    assert set(response.json()) == PUBLIC_FIELDS


async def test_admin_get_shop_requires_auth(auth_client: AsyncClient, fake_db) -> None:
    await _seed_default_shop(fake_db)

    response = await auth_client.get(ADMIN_SHOP_URL)

    assert response.status_code == 401


async def test_admin_put_shop_requires_auth(auth_client: AsyncClient, fake_db) -> None:
    await _seed_default_shop(fake_db)

    response = await auth_client.put(ADMIN_SHOP_URL, json={"shop_name": "Nope"})

    assert response.status_code == 401


async def test_admin_get_shop_returns_current_settings(
    auth_client: AsyncClient, fake_db, seeded_admin
) -> None:
    await _seed_default_shop(fake_db)
    await _login(auth_client)

    response = await auth_client.get(ADMIN_SHOP_URL)

    assert response.status_code == 200
    assert response.json() == {
        "shop_name": "Car Decor Shop",
        "whatsapp_number": "",
        "phone": "",
        "email": None,
        "address": "",
        "business_hours": None,
        "social_links": {},
        "logo_url": None,
    }


async def test_admin_put_updates_existing_singleton(
    auth_client: AsyncClient, fake_db, seeded_admin
) -> None:
    await _seed_default_shop(fake_db)
    headers = await _login(auth_client)

    response = await auth_client.put(
        ADMIN_SHOP_URL,
        headers=headers,
        json={
            "shop_name": "Coco Detailing",
            "whatsapp_number": "+91 98765 43210",
            "phone": "+91 11 2233 4455",
            "email": "SHOP@example.com",
            "address": "MG Road, Bengaluru",
            "business_hours": "Mon-Sat 9am-7pm",
            "logo_url": "https://cdn.example.com/logo.png",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["shop_name"] == "Coco Detailing"
    assert body["whatsapp_number"] == "+91 98765 43210"
    assert body["email"] == "shop@example.com"

    public = await auth_client.get(SHOP_URL)
    assert public.json()["shop_name"] == "Coco Detailing"


async def test_admin_put_keeps_singleton_document_singular(
    auth_client: AsyncClient, fake_db, seeded_admin
) -> None:
    await _seed_default_shop(fake_db)
    headers = await _login(auth_client)

    first = await auth_client.put(ADMIN_SHOP_URL, headers=headers, json={"shop_name": "First Name"})
    second = await auth_client.put(
        ADMIN_SHOP_URL, headers=headers, json={"shop_name": "Second Name"}
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert await ShopSettingsRepository(fake_db).count() == 1
    assert (await auth_client.get(SHOP_URL)).json()["shop_name"] == "Second Name"


async def test_admin_put_on_unseeded_database_creates_only_the_singleton(
    auth_client: AsyncClient, fake_db, seeded_admin
) -> None:
    headers = await _login(auth_client)

    await auth_client.put(ADMIN_SHOP_URL, headers=headers, json={"shop_name": "Brand New Shop"})

    assert await ShopSettingsRepository(fake_db).count() == 1
    assert (await ShopSettingsRepository(fake_db).get()).shop_name == "Brand New Shop"


async def test_additional_seed_after_put_is_a_noop(
    auth_client: AsyncClient, fake_db, seeded_admin
) -> None:
    headers = await _login(auth_client)
    await auth_client.put(ADMIN_SHOP_URL, headers=headers, json={"shop_name": "My Shop"})

    created = await seed_shop_settings(fake_db, ShopSettings(shop_name="Other Shop"))
    assert created is False
    assert await ShopSettingsRepository(fake_db).count() == 1


async def test_partial_update_preserves_other_fields(
    auth_client: AsyncClient, fake_db, seeded_admin
) -> None:
    await _seed_default_shop(fake_db)
    headers = await _login(auth_client)
    await auth_client.put(
        ADMIN_SHOP_URL,
        headers=headers,
        json={"shop_name": "Updated", "phone": "555-0100"},
    )

    stored = await ShopSettingsRepository(fake_db).get()
    assert stored.shop_name == "Updated"
    assert stored.phone == "555-0100"
    assert stored.whatsapp_number == ""
    assert stored.email is None


async def test_clearing_optional_fields(auth_client: AsyncClient, fake_db, seeded_admin) -> None:
    await _seed_default_shop(fake_db)
    headers = await _login(auth_client)
    await auth_client.put(
        ADMIN_SHOP_URL,
        headers=headers,
        json={
            "email": "hello@example.com",
            "social_links": {"instagram": "https://instagram.com/shop"},
            "business_hours": "Open 24/7",
            "logo_url": "/media/logo.png",
        },
    )

    cleared = await auth_client.put(
        ADMIN_SHOP_URL,
        headers=headers,
        json={
            "email": None,
            "social_links": None,
            "business_hours": None,
            "logo_url": None,
        },
    )

    assert cleared.status_code == 200
    body = cleared.json()
    assert body["email"] is None
    assert body["business_hours"] is None
    assert body["logo_url"] is None
    assert body["social_links"] == {}
    assert body["shop_name"] == "Car Decor Shop"
    assert body["phone"] == ""


async def test_admin_put_requires_csrf_token(
    auth_client: AsyncClient, fake_db, seeded_admin
) -> None:
    await _seed_default_shop(fake_db)
    await _login(auth_client)

    response = await auth_client.put(ADMIN_SHOP_URL, json={"shop_name": "Sneaky"})

    assert response.status_code == 403


@pytest.mark.parametrize(
    ("body", "expected_message_part"),
    [
        ({"shop_name": "   "}, "shop_name"),
        ({"email": "not-an-email"}, "value_error"),
        ({"phone": "with\tcontrol"}, "value_error"),
        ({"social_links": {"instagram": "not-a-url"}}, "value_error"),
        ({"social_links": {"tiktok": "https://tiktok.com/x"}}, "unsupported"),
        ({"logo_url": "https://"}, "value_error"),
        ({"logo_url": "not a url"}, "value_error"),
        ({"shop_name": "x" * 201}, "max_length"),
    ],
)
async def test_validation_rejects_malformed_input(
    auth_client: AsyncClient, fake_db, seeded_admin, body: dict, expected_message_part: str
) -> None:
    await _seed_default_shop(fake_db)
    headers = await _login(auth_client)

    response = await auth_client.put(ADMIN_SHOP_URL, headers=headers, json=body)

    assert response.status_code == 422
    assert expected_message_part in response.text


async def test_empty_update_is_a_noop(auth_client: AsyncClient, fake_db, seeded_admin) -> None:
    await _seed_default_shop(fake_db)
    headers = await _login(auth_client)

    response = await auth_client.put(ADMIN_SHOP_URL, headers=headers, json={})

    assert response.status_code == 200
    assert response.json()["shop_name"] == "Car Decor Shop"
    assert await ShopSettingsRepository(fake_db).count() == 1
