"""Tests for category and subcategory management (B4)."""

import pytest
from httpx import AsyncClient

from app.db.indexes import ensure_indexes
from app.repositories.categories import CategoryRepository
from app.repositories.subcategories import SubcategoryRepository
from tests.support.mongomock_async import AsyncDatabase

ADMIN_CATEGORIES = "/api/admin/categories"
ADMIN_SUBCATEGORIES = "/api/admin/subcategories"
PUBLIC_CATEGORIES = "/api/categories"


@pytest.fixture(autouse=True)
async def _ensure_catalog_indexes(fake_db: AsyncDatabase) -> None:
    """Unique slug indexes are the DB-level backstop for slug rules."""
    await ensure_indexes(fake_db)


async def _create_category(
    admin_client: AsyncClient,
    headers: dict[str, str],
    *,
    name: str = "Interior",
    **overrides,
):
    body = {"name": name, **overrides}
    return await admin_client.post(ADMIN_CATEGORIES, headers=headers, json=body)


async def _create_subcategory(
    admin_client: AsyncClient,
    headers: dict[str, str],
    category_id: str,
    *,
    name: str = "Seat Covers",
    **overrides,
):
    body = {"category_id": category_id, "name": name, **overrides}
    return await admin_client.post(ADMIN_SUBCATEGORIES, headers=headers, json=body)


# ---------------------------------------------------------------------------
# Category CRUD
# ---------------------------------------------------------------------------


async def test_create_category_generates_slug(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    response = await _create_category(auth_client, authed_headers, name="  Exterior  ")

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Exterior"
    assert body["slug"] == "exterior"
    assert body["is_active"] is True
    assert sorted(body) == sorted(
        ["id", "name", "slug", "description", "image_url", "sort_order", "is_active"]
    )


async def test_create_category_duplicate_name_gets_unique_slug(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    first = await _create_category(auth_client, authed_headers, name="Interior")
    second = await _create_category(auth_client, authed_headers, name="Interior")

    assert first.status_code == second.status_code == 201
    assert first.json()["slug"] == "interior"
    assert second.json()["slug"] == "interior-2"

    third = await _create_category(auth_client, authed_headers, name="Interior")
    assert third.json()["slug"] == "interior-3"


async def test_create_category_explicit_duplicate_slug_conflicts(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    await _create_category(auth_client, authed_headers, name="One", slug="shared")
    response = await _create_category(auth_client, authed_headers, name="Two", slug="shared")

    assert response.status_code == 409


async def test_get_category(auth_client: AsyncClient, authed_headers: dict[str, str]) -> None:
    created = await _create_category(auth_client, authed_headers, name="Interior")

    response = await auth_client.get(
        f"{ADMIN_CATEGORIES}/{created.json()['id']}", headers=authed_headers
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Interior"


async def test_get_missing_category_is_404(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    response = await auth_client.get(
        f"{ADMIN_CATEGORIES}/507f1f77bcf86cd799439011", headers=authed_headers
    )

    assert response.status_code == 404


async def test_update_category_preserves_slug(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    created = await _create_category(auth_client, authed_headers, name="Interior", sort_order=1)

    response = await auth_client.put(
        f"{ADMIN_CATEGORIES}/{created.json()['id']}",
        headers=authed_headers,
        json={"name": "Upgrades", "description": "Fresh look", "sort_order": 9},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Upgrades"
    assert body["slug"] == "interior"
    assert body["description"] == "Fresh look"
    assert body["sort_order"] == 9


async def test_update_category_explicit_slug_change(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    created = await _create_category(auth_client, authed_headers, name="Interior")

    response = await auth_client.put(
        f"{ADMIN_CATEGORIES}/{created.json()['id']}",
        headers=authed_headers,
        json={"slug": "interiores"},
    )

    assert response.status_code == 200
    assert response.json()["slug"] == "interiores"


async def test_deactivate_and_reactivate_category(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    created = await _create_category(auth_client, authed_headers, name="Interior")
    category_id = created.json()["id"]

    off = await auth_client.put(
        f"{ADMIN_CATEGORIES}/{category_id}",
        headers=authed_headers,
        json={"is_active": False},
    )
    assert off.status_code == 200
    assert off.json()["is_active"] is False

    changed = await auth_client.get(f"{ADMIN_CATEGORIES}/{category_id}", headers=authed_headers)
    assert changed.json()["is_active"] is False

    on = await auth_client.put(
        f"{ADMIN_CATEGORIES}/{category_id}",
        headers=authed_headers,
        json={"is_active": True},
    )
    assert on.json()["is_active"] is True


async def test_delete_category(
    auth_client: AsyncClient, authed_headers: dict[str, str], fake_db: AsyncDatabase
) -> None:
    created = await _create_category(auth_client, authed_headers, name="Temporary")

    response = await auth_client.delete(
        f"{ADMIN_CATEGORIES}/{created.json()['id']}", headers=authed_headers
    )

    assert response.status_code == 204
    assert await CategoryRepository(fake_db).count() == 0


async def test_invalid_category_data_rejected(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    cases = [
        {"name": "   "},
        {"name": "x", "slug": "INVALID SLUG!"},
        {"name": "x", "sort_order": -1},
        {"name": "x", "image_url": "not a url"},
        {"name": "x", "image_url": "https://"},
        {"name": "x" * 121},
    ]
    for body in cases:
        response = await _create_category(auth_client, authed_headers, **body)
        assert response.status_code == 422, body


# ---------------------------------------------------------------------------
# Public category API
# ---------------------------------------------------------------------------


async def test_public_categories_only_active(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    await _create_category(auth_client, authed_headers, name="Visible", sort_order=1)
    await _create_category(
        auth_client, authed_headers, name="Hidden", sort_order=2, is_active=False
    )

    response = await auth_client.get(PUBLIC_CATEGORIES)

    assert response.status_code == 200
    slugs = [category["slug"] for category in response.json()]
    assert slugs == ["visible"]


async def test_public_category_by_slug(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    await _create_category(
        auth_client,
        authed_headers,
        name="Interior",
        description="Inside the car",
        image_url="/media/interior.jpg",
    )

    response = await auth_client.get(f"{PUBLIC_CATEGORIES}/interior")

    assert response.status_code == 200
    assert response.json()["name"] == "Interior"
    assert response.json()["description"] == "Inside the car"
    assert response.json()["image_url"] == "/media/interior.jpg"


async def test_public_category_not_found_for_missing_or_inactive(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    missing = await auth_client.get(f"{PUBLIC_CATEGORIES}/nope")
    assert missing.status_code == 404

    await _create_category(auth_client, authed_headers, name="Dormant", is_active=False)
    dormant = await auth_client.get(f"{PUBLIC_CATEGORIES}/dormant")
    assert dormant.status_code == 404


# ---------------------------------------------------------------------------
# Subcategory CRUD
# ---------------------------------------------------------------------------


async def test_create_subcategory_under_category(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    category = await _create_category(auth_client, authed_headers, name="Interior")
    category_id = category.json()["id"]

    response = await _create_subcategory(
        auth_client, authed_headers, category_id, name=" Seat Covers "
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Seat Covers"
    assert body["slug"] == "seat-covers"
    assert body["category_id"] == category_id
    assert body["is_active"] is True


async def test_subcategory_under_nonexistent_category_rejected(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    response = await _create_subcategory(auth_client, authed_headers, "507f1f77bcf86cd799439011")

    assert response.status_code == 409
    assert "Category does not exist" in response.json()["detail"]


async def test_duplicate_subcategory_slug_within_category_conflicts(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    category = await _create_category(auth_client, authed_headers, name="Interior")
    category_id = category.json()["id"]
    await _create_subcategory(auth_client, authed_headers, category_id, name="Mat")

    explicit = await _create_subcategory(
        auth_client, authed_headers, category_id, name="Other", slug="mat"
    )
    assert explicit.status_code == 409

    auto = await _create_subcategory(auth_client, authed_headers, category_id, name="Mat")
    assert auto.status_code == 201
    assert auto.json()["slug"] == "mat-2"


async def test_same_subcategory_name_allowed_in_different_categories(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    interior = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    exterior = (await _create_category(auth_client, authed_headers, name="Exterior")).json()

    first = await _create_subcategory(auth_client, authed_headers, interior["id"], name="Mats")
    second = await _create_subcategory(auth_client, authed_headers, exterior["id"], name="Mats")

    assert first.status_code == second.status_code == 201
    assert first.json()["slug"] == second.json()["slug"] == "mats"


async def test_get_subcategory(auth_client: AsyncClient, authed_headers: dict[str, str]) -> None:
    category = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    created = (await _create_subcategory(auth_client, authed_headers, category["id"])).json()

    response = await auth_client.get(
        f"{ADMIN_SUBCATEGORIES}/{created['id']}", headers=authed_headers
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Seat Covers"


async def test_update_subcategory(auth_client: AsyncClient, authed_headers: dict[str, str]) -> None:
    category = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    created = (await _create_subcategory(auth_client, authed_headers, category["id"])).json()

    response = await auth_client.put(
        f"{ADMIN_SUBCATEGORIES}/{created['id']}",
        headers=authed_headers,
        json={"name": "Leather Covers", "sort_order": 4, "image_url": "/media/seat.jpg"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Leather Covers"
    assert body["slug"] == "seat-covers"
    assert body["sort_order"] == 4
    assert body["image_url"] == "/media/seat.jpg"


async def test_deactivate_and_reactivate_subcategory(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    category = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    created = (await _create_subcategory(auth_client, authed_headers, category["id"])).json()

    off = await auth_client.put(
        f"{ADMIN_SUBCATEGORIES}/{created['id']}",
        headers=authed_headers,
        json={"is_active": False},
    )
    assert off.json()["is_active"] is False

    on = await auth_client.put(
        f"{ADMIN_SUBCATEGORIES}/{created['id']}",
        headers=authed_headers,
        json={"is_active": True},
    )
    assert on.json()["is_active"] is True


async def test_delete_subcategory(
    auth_client: AsyncClient, authed_headers: dict[str, str], fake_db: AsyncDatabase
) -> None:
    category = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    created = (await _create_subcategory(auth_client, authed_headers, category["id"])).json()

    response = await auth_client.delete(
        f"{ADMIN_SUBCATEGORIES}/{created['id']}", headers=authed_headers
    )

    assert response.status_code == 204
    assert await SubcategoryRepository(fake_db).count() == 0


async def test_invalid_subcategory_data_rejected(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    category = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    cases = [
        {"category_id": category["id"], "name": " "},
        {"category_id": category["id"], "name": "Ok", "slug": "BAD SLUG"},
        {"category_id": category["id"], "name": "Ok", "sort_order": -5},
        {"category_id": category["id"], "name": "Ok", "image_url": "ftp://nope"},
        {"category_id": "not-an-id", "name": "Ok"},
    ]
    for body in cases:
        response = await auth_client.post(ADMIN_SUBCATEGORIES, headers=authed_headers, json=body)
        assert response.status_code == 422, body


# ---------------------------------------------------------------------------
# Public subcategories + relationship
# ---------------------------------------------------------------------------


async def test_public_subcategories_only_active_and_scoped(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    interior = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    exterior = (await _create_category(auth_client, authed_headers, name="Exterior")).json()
    await _create_subcategory(auth_client, authed_headers, interior["id"], name="Seats")
    await _create_subcategory(
        auth_client,
        authed_headers,
        interior["id"],
        name="Hidden",
        is_active=False,
    )
    await _create_subcategory(auth_client, authed_headers, exterior["id"], name="Bumpers")

    response = await auth_client.get(f"{PUBLIC_CATEGORIES}/interior/subcategories")

    assert response.status_code == 200
    body = response.json()
    assert [item["slug"] for item in body] == ["seats"]
    assert all(item["category_id"] == interior["id"] for item in body)


async def test_public_subcategories_require_active_category(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    category = await _create_category(auth_client, authed_headers, name="Dormant", is_active=False)
    await _create_subcategory(auth_client, authed_headers, category.json()["id"], name="Seats")

    response = await auth_client.get(f"{PUBLIC_CATEGORIES}/dormant/subcategories")

    assert response.status_code == 404


async def test_category_to_subcategory_relationship_is_correct(
    auth_client: AsyncClient, authed_headers: dict[str, str], fake_db: AsyncDatabase
) -> None:
    interior = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    exterior = (await _create_category(auth_client, authed_headers, name="Exterior")).json()
    await _create_subcategory(auth_client, authed_headers, interior["id"], name="Seats")
    await _create_subcategory(auth_client, authed_headers, interior["id"], name="Mats")
    await _create_subcategory(auth_client, authed_headers, exterior["id"], name="Kits")

    subcategories = await SubcategoryRepository(fake_db).list_with_query({})
    assert len(subcategories) == 3
    for subcategory in subcategories:
        assert str(subcategory.category_id) in {interior["id"], exterior["id"]}

    interior_children = await SubcategoryRepository(fake_db).list_by_category(
        (await CategoryRepository(fake_db).get_by_slug("interior")).id
    )
    assert {subcategory.slug for subcategory in interior_children} == {"seats", "mats"}


# ---------------------------------------------------------------------------
# Authorization
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "url", "body"),
    [
        ("post", ADMIN_CATEGORIES, {"name": "Hack"}),
        ("put", f"{ADMIN_CATEGORIES}/507f1f77bcf86cd799439011", {"name": "Hack"}),
        ("delete", f"{ADMIN_CATEGORIES}/507f1f77bcf86cd799439011", None),
        ("post", ADMIN_SUBCATEGORIES, {"category_id": "507f1f77bcf86cd799439011", "name": "Hack"}),
        ("put", f"{ADMIN_SUBCATEGORIES}/507f1f77bcf86cd799439011", {"name": "Hack"}),
        ("delete", f"{ADMIN_SUBCATEGORIES}/507f1f77bcf86cd799439011", None),
    ],
)
async def test_admin_mutations_require_authentication(
    auth_client: AsyncClient, method: str, url: str, body: dict | None
) -> None:
    response = await auth_client.request(method, url, json=body)

    assert response.status_code == 401


@pytest.mark.parametrize(
    ("method", "url", "body"),
    [
        ("post", ADMIN_CATEGORIES, {"name": "Hack"}),
        ("put", f"{ADMIN_CATEGORIES}/507f1f77bcf86cd799439011", {"name": "Hack"}),
        ("delete", f"{ADMIN_CATEGORIES}/507f1f77bcf86cd799439011", None),
    ],
)
async def test_admin_mutations_require_csrf(
    auth_client: AsyncClient, authed_headers: dict[str, str], method: str, url: str, body
) -> None:
    response = await auth_client.request(method, url, json=body)

    assert response.status_code == 403


async def test_public_reads_require_no_authentication(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    await _create_category(auth_client, authed_headers, name="Interior")

    response = await auth_client.get(PUBLIC_CATEGORIES)

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Data integrity
# ---------------------------------------------------------------------------


async def test_delete_category_with_subcategories_is_rejected(
    auth_client: AsyncClient, authed_headers: dict[str, str], fake_db: AsyncDatabase
) -> None:
    category = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    await _create_subcategory(auth_client, authed_headers, category["id"], name="Seats")

    response = await auth_client.delete(
        f"{ADMIN_CATEGORIES}/{category['id']}", headers=authed_headers
    )

    assert response.status_code == 409
    assert "subcategor" in response.json()["detail"]
    assert await CategoryRepository(fake_db).count() == 1
    assert await SubcategoryRepository(fake_db).count() == 1


async def test_updating_subcategory_to_nonexistent_category_rejected(
    auth_client: AsyncClient, authed_headers: dict[str, str]
) -> None:
    category = (await _create_category(auth_client, authed_headers, name="Interior")).json()
    created = (await _create_subcategory(auth_client, authed_headers, category["id"])).json()

    response = await auth_client.put(
        f"{ADMIN_SUBCATEGORIES}/{created['id']}",
        headers=authed_headers,
        json={"category_id": "507f1f77bcf86cd799439011"},
    )

    assert response.status_code == 409


async def test_repeated_operations_stay_consistent(
    auth_client: AsyncClient, authed_headers: dict[str, str], fake_db: AsyncDatabase
) -> None:
    category_ids = []
    for _ in range(3):
        created = await _create_category(auth_client, authed_headers, name="Repeated")
        category_ids.append(created.json()["id"])

    slugs = {
        (await auth_client.get(f"{ADMIN_CATEGORIES}/{cid}", headers=authed_headers)).json()["slug"]
        for cid in category_ids
    }
    assert slugs == {"repeated", "repeated-2", "repeated-3"}

    category_repo = CategoryRepository(fake_db)
    assert await category_repo.count() == 3

    for category_id in category_ids:
        assert (
            await auth_client.delete(f"{ADMIN_CATEGORIES}/{category_id}", headers=authed_headers)
        ).status_code == 204

    fresh = await _create_category(auth_client, authed_headers, name="Repeated")
    assert fresh.json()["slug"] == "repeated"

    assert await category_repo.count() == 1
