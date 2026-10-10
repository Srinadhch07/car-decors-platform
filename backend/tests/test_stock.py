"""Product stock management tests.

Covers creation/edit defaults, the atomic +/-1 adjustment endpoint, zero-stock
handling, invalid input, authorization, missing products, database failures,
concurrent adjustments, and legacy products stored without a stock field.
"""

import asyncio

import pytest
from bson import ObjectId
from httpx import AsyncClient
from pymongo.errors import PyMongoError

from app.models.base import utc_now
from app.repositories.products import ProductRepository
from tests.conftest import login_headers
from tests.support.fake_storage import MemoStorage


async def create_category(
    client: AsyncClient, headers: dict, *, name: str = "Interior", is_active: bool = True
) -> dict:
    response = await client.post(
        "/api/admin/categories",
        headers=headers,
        json={"name": name, "is_active": is_active, "sort_order": 1},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_subcategory(
    client: AsyncClient,
    headers: dict,
    category_id: str,
    *,
    name: str = "Seat Covers",
    is_active: bool = True,
) -> dict:
    response = await client.post(
        "/api/admin/subcategories",
        headers=headers,
        json={
            "category_id": category_id,
            "name": name,
            "is_active": is_active,
            "sort_order": 1,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_product(
    client: AsyncClient,
    headers: dict,
    category_id: str,
    *,
    name: str = "Premium Seat Covers",
    subcategory_id: str | None = None,
    data: dict | None = None,
) -> dict:
    body = {"name": name, "category_id": category_id}
    if subcategory_id is not None:
        body["subcategory_id"] = subcategory_id
    if data:
        body.update(data)
    response = await client.post("/api/admin/products", headers=headers, data=body)
    return {"status": response.status_code, "json": response.json()}


async def seed_graph(client: AsyncClient, headers: dict) -> tuple[dict, dict]:
    category = await create_category(client, headers)
    subcategory = await create_subcategory(client, headers, category["id"])
    return category, subcategory


async def create_visible_product(
    client: AsyncClient, headers: dict, category_id: str, **kwargs
) -> dict:
    result = await create_product(client, headers, category_id, **kwargs)
    assert result["status"] == 201, result["json"]
    return result["json"]


@pytest.fixture
async def headers(product_client, seeded_admin) -> dict:
    client, _storage = product_client
    return await login_headers(client)


@pytest.fixture
async def client(product_client) -> AsyncClient:
    return product_client[0]


@pytest.fixture
async def storage(product_client) -> MemoStorage:
    return product_client[1]


@pytest.fixture
async def catalog_graph(client, headers) -> tuple[dict, dict]:
    category, subcategory = await seed_graph(client, headers)
    return category, subcategory


# ---------------------------------------------------------------------------
# Creation / edit
# ---------------------------------------------------------------------------


async def test_create_product_defaults_stock_to_zero(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    result = await create_product(client, headers, category["id"])

    assert result["status"] == 201
    assert result["json"]["stock_quantity"] == 0


async def test_create_product_accepts_stock_quantity(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    result = await create_product(
        client, headers, category["id"], data={"stock_quantity": "7"}
    )

    assert result["status"] == 201
    assert result["json"]["stock_quantity"] == 7


async def test_create_product_rejects_negative_stock(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    result = await create_product(
        client, headers, category["id"], data={"stock_quantity": "-1"}
    )

    assert result["status"] == 422
    assert "stock_quantity" in str(result["json"])


async def test_create_product_rejects_non_integer_stock(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    for bad in ("abc", "1.5", ""):
        result = await create_product(
            client, headers, category["id"], data={"stock_quantity": bad}
        )
        if bad == "":
            assert result["status"] == 201
            assert result["json"]["stock_quantity"] == 0
        else:
            assert result["status"] == 422, bad


async def test_edit_stock_via_product_update(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "2"}
    )

    response = await client.put(
        f"/api/admin/products/{product['id']}",
        headers=headers,
        data={"stock_quantity": "5"},
    )
    assert response.status_code == 200
    assert response.json()["stock_quantity"] == 5

    response = await client.put(
        f"/api/admin/products/{product['id']}",
        headers=headers,
        data={"stock_quantity": "0"},
    )
    assert response.status_code == 200
    assert response.json()["stock_quantity"] == 0


async def test_edit_without_stock_leaves_stock_unchanged(
    client, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "5"}
    )

    response = await client.put(
        f"/api/admin/products/{product['id']}",
        headers=headers,
        data={"description": "Unchanged stock"},
    )

    assert response.status_code == 200
    assert response.json()["stock_quantity"] == 5


# ---------------------------------------------------------------------------
# Atomic +1 / -1 adjustments
# ---------------------------------------------------------------------------


async def test_adjust_stock_increments(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "2"}
    )

    first = await client.patch(
        f"/api/admin/products/{product['id']}/stock", json={"delta": 1}, headers=headers
    )
    assert first.status_code == 200
    assert first.json()["stock_quantity"] == 3

    second = await client.patch(
        f"/api/admin/products/{product['id']}/stock", json={"delta": 1}, headers=headers
    )
    assert second.status_code == 200
    assert second.json()["stock_quantity"] == 4


async def test_adjust_stock_decrements(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "3"}
    )

    response = await client.patch(
        f"/api/admin/products/{product['id']}/stock", json={"delta": -1}, headers=headers
    )

    assert response.status_code == 200
    assert response.json()["stock_quantity"] == 2


async def test_adjust_stock_decrement_at_zero_rejected(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "0"}
    )

    response = await client.patch(
        f"/api/admin/products/{product['id']}/stock", json={"delta": -1}, headers=headers
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Cannot decrement stock below zero"

    persisted = await client.get(f"/api/admin/products/{product['id']}", headers=headers)
    assert persisted.status_code == 200
    assert persisted.json()["stock_quantity"] == 0


async def test_adjust_stock_rejects_non_unit_deltas(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "5"}
    )

    for delta in (0, 2, -2, -5):
        response = await client.patch(
            f"/api/admin/products/{product['id']}/stock",
            json={"delta": delta},
            headers=headers,
        )
        assert response.status_code == 422, delta


async def test_adjust_stock_nonexistent_product(client, headers) -> None:
    response = await client.patch(
        f"/api/admin/products/{'0' * 24}/stock", json={"delta": 1}, headers=headers
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"


async def test_adjust_stock_requires_authentication(client) -> None:
    response = await client.patch(
        f"/api/admin/products/{'0' * 24}/stock", json={"delta": 1}
    )

    assert response.status_code == 401


async def test_adjust_stock_requires_csrf(client, catalog_graph, headers) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "2"}
    )

    response = await client.patch(
        f"/api/admin/products/{product['id']}/stock",
        json={"delta": 1},
    )

    assert response.status_code == 403


async def test_adjust_stock_concurrent_increments_are_not_lost(
    client, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(client, headers, category["id"])

    responses = await asyncio.gather(
        client.patch(
            f"/api/admin/products/{product['id']}/stock",
            json={"delta": 1},
            headers=headers,
        ),
        client.patch(
            f"/api/admin/products/{product['id']}/stock",
            json={"delta": 1},
            headers=headers,
        ),
    )

    assert all(response.status_code == 200 for response in responses)
    persisted = await client.get(f"/api/admin/products/{product['id']}", headers=headers)
    assert persisted.json()["stock_quantity"] == 2


async def test_adjust_stock_legacy_product_without_stock_field(
    client, headers, fake_db, catalog_graph
) -> None:
    category, _ = catalog_graph
    product_id = ObjectId()
    await fake_db["products"].insert_one(
        {
            "_id": product_id,
            "category_id": ObjectId(category["id"]),
            "subcategory_id": None,
            "name": "Legacy Product",
            "slug": "legacy-product",
            "description": "",
            "price": None,
            "availability": "OUT_OF_STOCK",
            "is_active": True,
            "vehicle_tags": [],
            "image_url": None,
            "created_at": utc_now(),
            "updated_at": utc_now(),
        }
    )

    admin_view = await client.get(f"/api/admin/products/{product_id}", headers=headers)
    assert admin_view.status_code == 200
    assert admin_view.json()["stock_quantity"] == 0

    blocked = await client.patch(
        f"/api/admin/products/{product_id}/stock", json={"delta": -1}, headers=headers
    )
    assert blocked.status_code == 409

    incremented = await client.patch(
        f"/api/admin/products/{product_id}/stock", json={"delta": 1}, headers=headers
    )
    assert incremented.status_code == 200
    assert incremented.json()["stock_quantity"] == 1


async def test_adjust_stock_database_failure_returns_502(
    client, headers, catalog_graph, monkeypatch
) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], data={"stock_quantity": "3"}
    )

    async def _boom(self, object_id, delta):
        raise PyMongoError("connection lost")

    monkeypatch.setattr(ProductRepository, "adjust_stock", _boom)

    response = await client.patch(
        f"/api/admin/products/{product['id']}/stock", json={"delta": 1}, headers=headers
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "Stock update failed; please try again"


# ---------------------------------------------------------------------------
# Stock stays admin-only
# ---------------------------------------------------------------------------


async def test_admin_listing_includes_stock(client, headers, catalog_graph) -> None:
    category, subcategory = catalog_graph
    await create_visible_product(
        client,
        headers,
        category["id"],
        subcategory_id=subcategory["id"],
        name="Stocked Item",
        data={"stock_quantity": "9"},
    )

    response = await client.get("/api/admin/products", headers=headers)

    assert response.status_code == 200
    assert [item["stock_quantity"] for item in response.json()["items"]] == [9]


async def test_public_product_hides_stock(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Featured Item",
        data={
            "stock_quantity": "5",
            "availability": "IN_STOCK",
            "is_active": "true",
        },
    )

    detail = await client.get(f"/api/products/{product['slug']}")
    assert detail.status_code == 200
    assert "stock_quantity" not in detail.json()

    listing = await client.get("/api/products")
    assert listing.status_code == 200
    assert all("stock_quantity" not in item for item in listing.json()["items"])