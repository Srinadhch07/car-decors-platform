"""Optional external product link tests.

Covers persisting, editing, and clearing the admin-only ``external_url`` field,
backend http(s) validation, backward compatibility for legacy products, and the
guarantee that the public read path still hides admin-only stock quantities.
"""

import pytest
from bson import ObjectId
from httpx import AsyncClient

from app.repositories.products import ProductRepository
from tests.conftest import login_headers
from tests.support.fake_storage import MemoStorage


async def create_category(
    client: AsyncClient, headers: dict, *, name: str = "Interior"
) -> dict:
    response = await client.post(
        "/api/admin/categories",
        headers=headers,
        json={"name": name, "is_active": True, "sort_order": 1},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def create_product(
    client: AsyncClient,
    headers: dict,
    category_id: str,
    *,
    name: str = "Premium Seat Covers",
    data: dict | None = None,
) -> dict:
    body = {"name": name, "category_id": category_id}
    if data:
        body.update(data)
    response = await client.post("/api/admin/products", headers=headers, data=body)
    return {"status": response.status_code, "json": response.json()}


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
async def category(client, headers) -> dict:
    """A single active category shared by the product tests in this file."""
    return await create_category(client, headers)


# ---------------------------------------------------------------------------
# Creation
# ---------------------------------------------------------------------------


async def test_create_product_stores_external_url(client, headers, category) -> None:
    result = await create_product(
        client,
        headers,
        category["id"],
        data={"external_url": "https://www.youtube.com/watch?v=abc123"},
    )

    assert result["status"] == 201
    assert result["json"]["external_url"] == "https://www.youtube.com/watch?v=abc123"


async def test_create_product_defaults_external_url_to_none(
    client, headers, category
) -> None:
    result = await create_product(client, headers, category["id"])

    assert result["status"] == 201
    assert result["json"]["external_url"] is None


async def test_create_product_blank_external_url_becomes_none(
    client, headers, category
) -> None:
    result = await create_product(
        client, headers, category["id"], data={"external_url": " "}
    )

    assert result["status"] == 201
    assert result["json"]["external_url"] is None


@pytest.mark.parametrize("url", ["http://example.com", "https://example.com"])
async def test_create_product_accepts_http_and_https(
    client, headers, category, url
) -> None:
    result = await create_product(
        client, headers, category["id"], data={"external_url": url}
    )

    assert result["status"] == 201
    assert result["json"]["external_url"] == url


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        "ftp://example.com/file",
        "not a url",
        "/root-relative-path",
        "http://",
        "https://",
    ],
)
async def test_create_product_rejects_unsafe_or_malformed_urls(
    client, headers, category, url
) -> None:
    result = await create_product(
        client, headers, category["id"], data={"external_url": url}
    )

    assert result["status"] == 422
    assert "external_url" in result["json"]["detail"]


# ---------------------------------------------------------------------------
# Editing
# ---------------------------------------------------------------------------


async def test_update_product_sets_external_url(client, headers, category) -> None:
    created = await create_product(client, headers, category["id"])
    assert created["status"] == 201
    product_id = created["json"]["id"]

    response = await client.put(
        f"/api/admin/products/{product_id}",
        headers=headers,
        data={"external_url": "https://www.instagram.com/reel/xyz/"},
    )

    assert response.status_code == 200
    assert response.json()["external_url"] == "https://www.instagram.com/reel/xyz/"


async def test_update_product_clears_external_url(client, headers, category) -> None:
    created = await create_product(
        client,
        headers,
        category["id"],
        data={"external_url": "https://example.com/video"},
    )
    assert created["status"] == 201
    product_id = created["json"]["id"]

    response = await client.put(
        f"/api/admin/products/{product_id}",
        headers=headers,
        data={"clear_fields": "external_url"},
    )

    assert response.status_code == 200
    assert response.json()["external_url"] is None

    detail = await client.get(f"/api/admin/products/{product_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["external_url"] is None


async def test_update_without_external_url_leaves_it_unchanged(
    client, headers, category
) -> None:
    created = await create_product(
        client,
        headers,
        category["id"],
        data={"external_url": "https://example.com/video"},
    )
    assert created["status"] == 201
    product_id = created["json"]["id"]

    response = await client.put(
        f"/api/admin/products/{product_id}",
        headers=headers,
        data={"description": "Updated description"},
    )

    assert response.status_code == 200
    assert response.json()["external_url"] == "https://example.com/video"


async def test_update_product_rejects_unsafe_url(client, headers, category) -> None:
    created = await create_product(client, headers, category["id"])
    assert created["status"] == 201
    product_id = created["json"]["id"]

    response = await client.put(
        f"/api/admin/products/{product_id}",
        headers=headers,
        data={"external_url": "javascript:alert(1)"},
    )

    assert response.status_code == 422
    assert "external_url" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Public read privacy + legacy compatibility
# ---------------------------------------------------------------------------


async def test_public_reads_expose_external_url_but_never_stock(
    client, headers, category
) -> None:
    created = await create_product(
        client,
        headers,
        category["id"],
        data={
            "external_url": "https://example.com/product",
            "stock_quantity": "9",
        },
    )
    assert created["status"] == 201
    slug = created["json"]["slug"]

    detail = await client.get(f"/api/products/{slug}")
    assert detail.status_code == 200
    assert detail.json()["external_url"] == "https://example.com/product"
    assert "stock_quantity" not in detail.json()

    listing = await client.get("/api/products")
    assert listing.status_code == 200
    item = next(p for p in listing.json()["items"] if p["slug"] == slug)
    assert item["external_url"] == "https://example.com/product"
    assert "stock_quantity" not in item


async def test_legacy_product_without_external_url_reads_as_none(
    client, headers, category, fake_db
) -> None:
    created = await create_product(
        client,
        headers,
        category["id"],
        data={"stock_quantity": "4"},
    )
    assert created["status"] == 201
    admin_id = created["json"]["id"]

    # Simulate a legacy product stored before external_url existed.
    repository = ProductRepository(fake_db)
    await repository.collection.update_one(
        {"_id": ObjectId(admin_id)}, {"$unset": {"external_url": ""}}
    )
    raw = await repository.collection.find_one({"_id": ObjectId(admin_id)})
    assert raw is not None
    assert "external_url" not in raw
    slug = raw["slug"]

    admin_read = await client.get(f"/api/admin/products/{admin_id}", headers=headers)
    assert admin_read.status_code == 200
    assert admin_read.json()["external_url"] is None

    public_read = await client.get(f"/api/products/{slug}")
    assert public_read.status_code == 200
    assert "external_url" in public_read.json()
    assert public_read.json()["external_url"] is None