"""B5 product tests: CRUD, slugs, visibility, discovery, and image lifecycle."""

import pytest
from httpx import AsyncClient
from pymongo.errors import DuplicateKeyError

from app.services.products import ProductRepository as ServiceProductRepository
from tests.conftest import login_headers
from tests.support.fake_storage import MemoStorage

JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 8
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8
WEBP_BYTES = b"RIFF\x12\x34\x56\x78WEBPVP8 " + b"\x00" * 4


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
    image: tuple[str, bytes, str] | None = None,
) -> dict:
    body = {"name": name, "category_id": category_id}
    if subcategory_id is not None:
        body["subcategory_id"] = subcategory_id
    if data:
        body.update(data)
    files = {"image": image} if image else None
    response = await client.post("/api/admin/products", headers=headers, data=body, files=files)
    return {"status": response.status_code, "json": response.json()}


async def seed_graph(client: AsyncClient, headers: dict) -> tuple[dict, dict]:
    category = await create_category(client, headers)
    subcategory = await create_subcategory(client, headers, category["id"])
    return category, subcategory


async def create_visible_product(
    client: AsyncClient,
    headers: dict,
    category_id: str,
    subcategory_id: str | None = None,
    **kwargs,
) -> dict:
    result = await create_product(
        client,
        headers,
        category_id,
        subcategory_id=subcategory_id,
        **kwargs,
    )
    assert result["status"] == 201, result["json"]
    return result["json"]


@pytest.fixture
async def catalog_graph(client, headers) -> tuple[dict, dict]:
    category, subcategory = await seed_graph(client, headers)
    return category, subcategory


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
async def populated_client(
    product_client, seeded_admin, headers
) -> tuple[AsyncClient, MemoStorage, dict, dict]:
    """Client with one active category, one subcategory, and one active product."""
    client, memo = product_client
    category, subcategory = await seed_graph(client, headers)
    await create_visible_product(
        client,
        headers,
        category["id"],
        subcategory["id"],
        name="Luxury Leather Seat Covers",
        data={"price": "2499.00", "vehicle_tags": '["Hyundai Creta", "Universal"]'},
    )
    return client, memo, category, subcategory


# ---------------------------------------------------------------------------
# Product creation
# ---------------------------------------------------------------------------


async def test_create_product_valid_without_image(client, headers, catalog_graph) -> None:
    category, subcategory = catalog_graph

    result = await create_product(client, headers, category["id"], subcategory_id=subcategory["id"])
    product = result["json"]

    assert result["status"] == 201
    assert product["name"] == "Premium Seat Covers"
    assert product["slug"] == "premium-seat-covers"
    assert product["category_id"] == category["id"]
    assert product["subcategory_id"] == subcategory["id"]
    assert product["description"] == ""
    assert product["price"] is None
    assert product["availability"] == "OUT_OF_STOCK"
    assert product["is_active"] is True
    assert product["vehicle_tags"] == []
    assert product["image_url"] is None


async def test_create_product_with_image(client, storage, headers, catalog_graph) -> None:
    category, _subcategory = catalog_graph

    result = await create_product(
        client, headers, category["id"], image=("photo.jpg", JPEG_BYTES, "image/jpeg")
    )

    assert result["status"] == 201
    product = result["json"]
    assert product["image_url"].startswith("https://files.test/products/")
    assert len(storage.objects) == 1


async def test_create_product_price_round_trips_decimal128(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    result = await create_product(
        client,
        headers,
        category["id"],
        data={"price": "1250.50", "availability": "IN_STOCK"},
    )

    assert result["status"] == 201
    assert result["json"]["price"] == "1250.50"
    assert result["json"]["availability"] == "IN_STOCK"


async def test_create_product_requires_category_and_name(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    missing = await client.post("/api/admin/products", headers=headers, data={"name": "X"})
    assert missing.status_code == 422

    no_name = await client.post(
        "/api/admin/products", headers=headers, data={"category_id": category["id"]}
    )
    assert no_name.status_code == 422


async def test_create_nonexistent_category_rejected(client, headers) -> None:
    result = await create_product(client, headers, "0" * 24)
    assert result["status"] == 409


async def test_create_nonexistent_subcategory_rejected(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    result = await create_product(client, headers, category["id"], subcategory_id="1" * 24)
    assert result["status"] == 409


async def test_create_mismatched_category_subcategory_rejected(client, headers) -> None:
    category_a = await create_category(client, headers, name="Interior")
    category_b = await create_category(client, headers, name="Exterior")
    subcategory_b = await create_subcategory(client, headers, category_b["id"])

    result = await create_product(
        client, headers, category_a["id"], subcategory_id=subcategory_b["id"]
    )
    assert result["status"] == 409


async def test_create_optional_subcategory(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    result = await create_product(client, headers, category["id"])

    assert result["status"] == 201
    assert result["json"]["subcategory_id"] is None


async def test_create_availability_must_be_valid(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    valid = await create_product(client, headers, category["id"], data={"availability": "ON_ORDER"})
    assert valid["status"] == 201
    assert valid["json"]["availability"] == "ON_ORDER"

    invalid = await create_product(
        client, headers, category["id"], data={"availability": "SOLD_OUT"}
    )
    assert invalid["status"] == 422


async def test_create_vehicle_tags_are_parsed(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    result = await create_product(
        client,
        headers,
        category["id"],
        data={"vehicle_tags": '[" Hyundai Creta ", "Kia Seltos"]'},
    )
    assert result["status"] == 201
    assert result["json"]["vehicle_tags"] == ["Hyundai Creta", "Kia Seltos"]


async def test_create_malformed_vehicle_tags_rejected(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph

    result = await create_product(
        client, headers, category["id"], data={"vehicle_tags": "not json"}
    )
    assert result["status"] == 422


# ---------------------------------------------------------------------------
# Slugs
# ---------------------------------------------------------------------------


async def test_automatic_slug_generation(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(
        client, headers, category["id"], name="Premium  Seat Covers!"
    )
    assert product["slug"] == "premium-seat-covers"


async def test_duplicate_slug_gets_numeric_suffix(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    first = await create_visible_product(client, headers, category["id"], name="Suede Mats")
    second = await create_visible_product(client, headers, category["id"], name="Suede Mats")

    assert first["slug"] == "suede-mats"
    assert second["slug"] == "suede-mats-2"


async def test_slug_is_globally_unique_across_categories(client, headers) -> None:
    category_a = await create_category(client, headers, name="Interior")
    category_b = await create_category(client, headers, name="Exterior")
    first = await create_visible_product(client, headers, category_a["id"], name="Dash Cam")
    second = await create_visible_product(client, headers, category_b["id"], name="Dash Cam")

    assert first["slug"] == "dash-cam"
    assert second["slug"] == "dash-cam-2"


async def test_rename_never_changes_slug(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    product = await create_visible_product(client, headers, category["id"], name="Mud Flaps")

    updated = await client.put(
        f"/api/admin/products/{product['id']}",
        headers=headers,
        data={"name": "Updated Mud Guards"},
    )

    assert updated.status_code == 200
    body = updated.json()
    assert body["slug"] == "mud-flaps"
    assert body["name"] == "Updated Mud Guards"


# ---------------------------------------------------------------------------
# Admin CRUD
# ---------------------------------------------------------------------------


async def test_admin_get_product(populated_client, headers) -> None:
    client, _memo, _category, _subcategory = populated_client
    fetched = await client.get("/api/products", headers=headers)
    assert fetched.status_code == 200


async def test_admin_crud_round_trip(client, headers, catalog_graph) -> None:
    category, subcategory = catalog_graph
    created = await create_visible_product(
        client, headers, category["id"], subcategory["id"], name="Round Trip"
    )

    fetched = await client.get(f"/api/admin/products/{created['id']}", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["slug"] == "round-trip"

    updated = await client.put(
        f"/api/admin/products/{created['id']}",
        headers=headers,
        data={"name": "Round Trip V2", "price": "999.00", "is_active": "false"},
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["slug"] == "round-trip"
    assert body["price"] == "999.00"
    assert body["is_active"] is False

    deleted = await client.delete(f"/api/admin/products/{created['id']}", headers=headers)
    assert deleted.status_code == 204

    gone = await client.get(f"/api/admin/products/{created['id']}", headers=headers)
    assert gone.status_code == 404


async def test_admin_update_clears_optional_fields(client, headers, catalog_graph) -> None:
    category, subcategory = catalog_graph
    created = await create_visible_product(
        client,
        headers,
        category["id"],
        subcategory["id"],
        name="Clearable",
        data={"price": "500.00"},
    )

    updated = await client.put(
        f"/api/admin/products/{created['id']}",
        headers=headers,
        data={"clear_fields": "subcategory_id,price"},
    )

    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["subcategory_id"] is None
    assert body["price"] is None


async def test_admin_update_rejects_mismatched_subcategory(client, headers) -> None:
    category_a = await create_category(client, headers, name="Interior")
    category_b = await create_category(client, headers, name="Exterior")
    subcategory_a = await create_subcategory(client, headers, category_a["id"])
    subcategory_b = await create_subcategory(client, headers, category_b["id"])
    created = await create_visible_product(client, headers, category_a["id"], name="Mover")

    moved = await client.put(
        f"/api/admin/products/{created['id']}",
        headers=headers,
        data={"category_id": category_b["id"], "subcategory_id": subcategory_b["id"]},
    )
    assert moved.status_code == 200, moved.text

    mismatched = await client.put(
        f"/api/admin/products/{created['id']}",
        headers=headers,
        data={"category_id": category_b["id"], "subcategory_id": subcategory_a["id"]},
    )
    assert mismatched.status_code == 409


async def test_admin_update_of_nonexistent_product_is_404(client, headers) -> None:
    response = await client.put(
        f"/api/admin/products/{'0' * 24}", headers=headers, data={"name": "X"}
    )
    assert response.status_code == 404


async def test_admin_delete_of_nonexistent_product_is_404(client, headers) -> None:
    response = await client.delete(f"/api/admin/products/{'0' * 24}", headers=headers)
    assert response.status_code == 404


async def test_product_deletion_removes_image(client, storage, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Imaged",
        image=("photo.jpg", JPEG_BYTES, "image/jpeg"),
    )
    key = storage.extract_key_from_url(created["image_url"])
    assert key and key in storage.objects

    response = await client.delete(f"/api/admin/products/{created['id']}", headers=headers)

    assert response.status_code == 204
    assert key not in storage.objects
    assert key in storage.deleted


# ---------------------------------------------------------------------------
# Public visibility
# ---------------------------------------------------------------------------


async def test_active_product_visible_in_listing_and_detail(
    client, headers, populated_client
) -> None:
    _client, _memo, category, _sub = populated_client
    created = await create_visible_product(client, headers, category["id"], name="Visible Item")

    listing = await client.get("/api/products")
    assert listing.status_code == 200
    slugs = [item["slug"] for item in listing.json()["items"]]
    assert "visible-item" in slugs

    detail = await client.get("/api/products/visible-item")
    assert detail.status_code == 200
    assert detail.json()["id"] == created["id"]


async def test_inactive_product_hidden(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(client, headers, category["id"], name="Hidden One")
    await client.put(
        f"/api/admin/products/{created['id']}", headers=headers, data={"is_active": "false"}
    )

    listing = await client.get("/api/products")
    assert listing.json()["items"] == []
    assert (await client.get("/api/products/hidden-one")).status_code == 404

    admin_listing = await client.get("/api/admin/products", headers=headers)
    assert len(admin_listing.json()["items"]) == 1


async def test_inactive_category_hides_products(client, headers) -> None:
    category = await create_category(client, headers, name="Interior", is_active=False)
    result = await create_product(client, headers, category["id"], name="In Dead Cat")
    assert result["status"] == 201

    listing = await client.get("/api/products")
    assert listing.json()["items"] == []
    assert (await client.get("/api/products/in-dead-cat")).status_code == 404


async def test_inactive_subcategory_hides_products(client, headers) -> None:
    category = await create_category(client, headers)
    subcategory = await create_subcategory(client, headers, category["id"])
    result = await create_product(
        client, headers, category["id"], subcategory_id=subcategory["id"], name="Subbed"
    )
    assert result["status"] == 201
    await client.put(
        f"/api/admin/subcategories/{subcategory['id']}",
        headers=headers,
        json={"is_active": False},
    )

    listing = await client.get("/api/products")
    assert listing.json()["items"] == []
    assert (await client.get("/api/products/subbed")).status_code == 404


async def test_untagged_product_of_active_category_still_visible(client, headers) -> None:
    category = await create_category(client, headers)
    await create_visible_product(client, headers, category["id"], name="Orphan Style")

    listing = await client.get("/api/products")
    assert any(item["slug"] == "orphan-style" for item in listing.json()["items"])


async def test_public_reads_require_no_authentication(client, headers, populated_client) -> None:
    response = await client.get("/api/products")
    assert response.status_code == 200
    assert (await client.get("/api/products/luxury-leather-seat-covers")).status_code == 200


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------


async def test_search_matches_name_description_and_vehicle_tag(
    client, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    await create_visible_product(
        client,
        headers,
        category["id"],
        name="Alloy Wheels",
        data={"description": "Lightweight forged alloy", "vehicle_tags": '["Hyundai Creta"]'},
    )

    for term, expected in [("alloy", True), ("forged", True), ("creta", True)]:
        page = (await client.get("/api/products", params={"search": term})).json()
        assert any(item["slug"] == "alloy-wheels" for item in page["items"]) is expected

    page = (await client.get("/api/products", params={"search": "nomatch"})).json()
    assert page["items"] == []


async def test_search_is_case_insensitive(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    await create_visible_product(client, headers, category["id"], name="LED Strip Light")

    page = (await client.get("/api/products", params={"search": "led strip"})).json()
    assert any(item["slug"] == "led-strip-light" for item in page["items"])


async def test_search_escapes_regex_metacharacters(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(
        client, headers, category["id"], name="Glove Box [2] 100%"
    )

    page = (await client.get("/api/products", params={"search": "[2]"})).json()
    assert any(item["slug"] == created["slug"] for item in page["items"])

    page = (await client.get("/api/products", params={"search": ".*"})).json()
    assert len(page["items"]) == 0


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------


async def test_filter_by_category_subcategory_vehicle_availability(client, headers) -> None:
    interior = await create_category(client, headers, name="Interior")
    mats = await create_subcategory(client, headers, interior["id"], name="Floor Mats")
    await create_visible_product(
        client,
        headers,
        interior["id"],
        mats["id"],
        name="Creta Mats",
        data={"availability": "IN_STOCK", "vehicle_tags": '["Hyundai Creta"]'},
    )
    await create_visible_product(
        client,
        headers,
        interior["id"],
        mats["id"],
        name="Seltos Mats",
        data={"availability": "ON_ORDER", "vehicle_tags": '["Kia Seltos"]'},
    )

    by_category = (await client.get("/api/products", params={"category": "interior"})).json()
    assert {item["name"] for item in by_category["items"]} == {"Creta Mats", "Seltos Mats"}

    by_subcategory = (
        await client.get("/api/products", params={"subcategory": "floor-mats"})
    ).json()
    assert len(by_subcategory["items"]) == 2

    by_vehicle = (await client.get("/api/products", params={"vehicle": "creta"})).json()
    assert [item["name"] for item in by_vehicle["items"]] == ["Creta Mats"]

    by_availability = (
        await client.get("/api/products", params={"availability": "ON_ORDER"})
    ).json()
    assert [item["name"] for item in by_availability["items"]] == ["Seltos Mats"]


async def test_filters_combine_with_and_semantics(client, headers) -> None:
    interior = await create_category(client, headers, name="Interior")
    mats = await create_subcategory(client, headers, interior["id"], name="Floor Mats")
    await create_visible_product(
        client,
        headers,
        interior["id"],
        mats["id"],
        name="Creta Mats",
        data={"availability": "IN_STOCK", "vehicle_tags": '["Hyundai Creta"]'},
    )
    await create_visible_product(
        client,
        headers,
        interior["id"],
        mats["id"],
        name="Creta Mats Deluxe",
        data={"availability": "ON_ORDER", "vehicle_tags": '["Hyundai Creta"]'},
    )

    params = {
        "category": "interior",
        "subcategory": "floor-mats",
        "vehicle": "creta",
        "availability": "IN_STOCK",
    }
    page = (await client.get("/api/products", params=params)).json()
    assert [item["name"] for item in page["items"]] == ["Creta Mats"]


async def test_subcategory_filter_within_inactive_category_is_empty(client, headers) -> None:
    category = await create_category(client, headers, name="Interior")
    subcategory = await create_subcategory(client, headers, category["id"], name="Mats")
    await create_visible_product(client, headers, category["id"], subcategory["id"], name="M")
    await client.put(
        f"/api/admin/categories/{category['id']}", headers=headers, json={"is_active": False}
    )

    page = (await client.get("/api/products", params={"subcategory": "mats"})).json()
    assert page["items"] == []


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


async def test_default_pagination_metadata(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    for index in range(25):
        await create_visible_product(client, headers, category["id"], name=f"Part {index}")

    page = (await client.get("/api/products")).json()
    assert page["page"] == 1
    assert page["page_size"] == 20
    assert page["total"] == 25
    assert page["total_pages"] == 2
    assert len(page["items"]) == 20


async def test_custom_page_size_and_out_of_range_page(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    for index in range(5):
        await create_visible_product(client, headers, category["id"], name=f"Item {index}")

    page_two = (await client.get("/api/products", params={"page_size": 2, "page": 3})).json()
    assert len(page_two["items"]) == 1
    assert page_two["total"] == 5
    assert page_two["total_pages"] == 3

    beyond = (await client.get("/api/products", params={"page": 99})).json()
    assert beyond["items"] == []
    assert beyond["total_pages"] == 1


async def test_maximum_page_size_is_enforced(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    await create_visible_product(client, headers, category["id"], name="Only")

    capped = (await client.get("/api/products", params={"page_size": 100})).json()
    assert capped["page_size"] == 100

    rejected = await client.get("/api/products", params={"page_size": 101})
    assert rejected.status_code == 422


# ---------------------------------------------------------------------------
# Sorting
# ---------------------------------------------------------------------------


async def test_sort_newest_and_oldest(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    first = await create_visible_product(client, headers, category["id"], name="Oldest")
    second = await create_visible_product(client, headers, category["id"], name="Middle")
    third = await create_visible_product(client, headers, category["id"], name="Newest")

    newest = (await client.get("/api/products", params={"sort": "newest"})).json()
    assert [item["id"] for item in newest["items"]] == [third["id"], second["id"], first["id"]]

    oldest = (await client.get("/api/products", params={"sort": "oldest"})).json()
    assert [item["id"] for item in oldest["items"]] == [first["id"], second["id"], third["id"]]


async def test_sort_by_name(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    await create_visible_product(client, headers, category["id"], name="Zulu")
    await create_visible_product(client, headers, category["id"], name="Alpha")
    await create_visible_product(client, headers, category["id"], name="Mike")

    asc = (await client.get("/api/products", params={"sort": "name_asc"})).json()
    assert [item["name"] for item in asc["items"]] == ["Alpha", "Mike", "Zulu"]

    desc = (await client.get("/api/products", params={"sort": "name_desc"})).json()
    assert [item["name"] for item in desc["items"]] == ["Zulu", "Mike", "Alpha"]


async def test_sort_by_price_with_unpriced_last(client, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    budget = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Budget",
        data={"price": "100.00"},
    )
    premium = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Premium",
        data={"price": "5000.00"},
    )
    unknown = await create_visible_product(client, headers, category["id"], name="Unknown")

    asc = (await client.get("/api/products", params={"sort": "price_asc"})).json()
    assert [item["id"] for item in asc["items"]] == [budget["id"], premium["id"], unknown["id"]]

    desc = (await client.get("/api/products", params={"sort": "price_desc"})).json()
    assert [item["id"] for item in desc["items"]] == [premium["id"], budget["id"], unknown["id"]]


async def test_invalid_sort_rejected(client, headers) -> None:
    response = await client.get("/api/products", params={"sort": {"$where": "sleep(1)"}})
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Security / CSRF
# ---------------------------------------------------------------------------


async def test_admin_endpoints_require_authentication(client) -> None:
    for method, url in (
        ("GET", "/api/admin/products"),
        ("GET", f"/api/admin/products/{'0' * 24}"),
        ("POST", "/api/admin/products"),
        ("PUT", f"/api/admin/products/{'0' * 24}"),
        ("DELETE", f"/api/admin/products/{'0' * 24}"),
    ):
        response = await client.request(
            method, url, data={"name": "X"} if method == "POST" else None
        )
        assert response.status_code == 401, f"{method} {url}"


async def test_invalid_auth_rejected(client) -> None:
    response = await client.get(
        "/api/admin/products",
        cookies={"car_decor_session": "garbage-not-a-jwt"},
    )
    assert response.status_code == 401


async def test_mutations_require_csrf(client, seeded_admin, catalog_graph) -> None:
    category, _ = catalog_graph
    authed = await client.post(
        "/api/admin/auth/login",
        json={"email": "admin@example.com", "password": "correct-horse-battery"},
    )
    assert authed.status_code == 200

    missing = await client.post(
        "/api/admin/products",
        data={"name": "X", "category_id": category["id"]},
    )
    assert missing.status_code == 403

    wrong = await client.post(
        "/api/admin/products",
        headers={"X-CSRF-Token": "wrong-token"},
        data={"name": "X", "category_id": category["id"]},
    )
    assert wrong.status_code == 403


async def test_mongodb_operator_injection_cannot_reach_queries(
    client, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    result = await create_product(
        client, headers, category["id"], name="$where", data={"vehicle_tags": '["{\\"$gt\\":1}"]'}
    )
    assert result["status"] == 201
    assert result["json"]["name"] == "$where"
    assert result["json"]["vehicle_tags"] == ['{"$gt":1}']

    listing = (await client.get("/api/products", params={"search": "$where"})).json()
    assert [item["name"] for item in listing["items"]] == ["$where"]

    response = await client.get("/api/products", params={"category": "$exists"})
    assert response.status_code == 200
    assert response.json()["items"] == []


# ---------------------------------------------------------------------------
# Image storage behavior
# ---------------------------------------------------------------------------


async def test_image_upload_failure_is_502(client, storage, headers, catalog_graph) -> None:
    category, _ = catalog_graph
    storage.fail_upload = True

    result = await create_product(
        client, headers, category["id"], image=("photo.jpg", JPEG_BYTES, "image/jpeg")
    )
    assert result["status"] == 502
    assert storage.objects == set()


async def test_image_replacement_deletes_old_and_saves_new(
    client, storage, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Replaced",
        image=("old.jpg", JPEG_BYTES, "image/jpeg"),
    )
    old_key = storage.extract_key_from_url(created["image_url"])

    updated = await client.put(
        f"/api/admin/products/{created['id']}",
        headers=headers,
        files={"image": ("new.webp", WEBP_BYTES, "image/webp")},
    )

    assert updated.status_code == 200, updated.text
    new_url = updated.json()["image_url"]
    new_key = storage.extract_key_from_url(new_url)
    assert new_key != old_key
    assert old_key not in storage.objects
    assert new_key in storage.objects
    assert old_key in storage.deleted


async def test_image_replacement_keeps_old_when_database_write_fails(
    client, storage, headers, catalog_graph, monkeypatch
) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Fragile",
        image=("old.jpg", JPEG_BYTES, "image/jpeg"),
    )
    old_key = storage.extract_key_from_url(created["image_url"])

    async def fail_update(*args, **kwargs):
        raise DuplicateKeyError("boom")

    monkeypatch.setattr(ServiceProductRepository, "update", fail_update)

    latest = await client.get(f"/api/admin/products/{created['id']}", headers=headers)
    old_url = latest.json()["image_url"]

    updated = await client.put(
        f"/api/admin/products/{created['id']}",
        headers=headers,
        files={"image": ("new.jpg", JPEG_BYTES, "image/jpeg")},
    )
    assert updated.status_code == 409

    after = (await client.get(f"/api/admin/products/{created['id']}", headers=headers)).json()
    assert after["image_url"] == old_url
    assert old_key in storage.objects
    assert old_key not in storage.deleted


async def test_storage_delete_failure_surfaces_on_product_delete(
    client, storage, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Cleanup Blocked",
        image=("old.jpg", JPEG_BYTES, "image/jpeg"),
    )
    key = storage.extract_key_from_url(created["image_url"])
    storage.fail_delete = True

    response = await client.delete(f"/api/admin/products/{created['id']}", headers=headers)

    assert response.status_code == 502
    assert key in storage.objects
    gone = await client.get(f"/api/admin/products/{created['id']}", headers=headers)
    assert gone.status_code == 404


async def test_replacement_surfaces_storage_failure_without_losing_new_upload(
    client, storage, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Partial Replace",
        image=("old.jpg", JPEG_BYTES, "image/jpeg"),
    )
    old_key = storage.extract_key_from_url(created["image_url"])
    storage.fail_delete = True

    updated = await client.put(
        f"/api/admin/products/{created['id']}",
        headers=headers,
        files={"image": ("new.png", PNG_BYTES, "image/png")},
    )

    assert updated.status_code == 502
    product_keys = {k for k in storage.objects if k.startswith("products/")}
    assert len(product_keys) == 2
    assert old_key in storage.objects


async def test_replace_no_image_keeps_existing_image(
    client, storage, headers, catalog_graph
) -> None:
    category, _ = catalog_graph
    created = await create_visible_product(
        client,
        headers,
        category["id"],
        name="Keep Img",
        image=("old.jpg", JPEG_BYTES, "image/jpeg"),
    )
    old_url = created["image_url"]

    updated = await client.put(
        f"/api/admin/products/{created['id']}", headers=headers, data={"name": "Keep Img V2"}
    )

    assert updated.status_code == 200
    assert updated.json()["image_url"] == old_url
    assert len(storage.objects) == 1


async def test_uploaded_image_size_limit_is_enforced(
    client, storage, headers, catalog_graph, tmp_path
) -> None:
    """5 MB is the maximum; larger uploads return 413."""
    category, _ = catalog_graph
    oversized = b"\xff\xd8\xff\xe0" + bytes(5 * 1024 * 1024)

    response = await client.post(
        "/api/admin/products",
        headers=headers,
        data={"name": "Big", "category_id": category["id"]},
        files={"image": ("big.jpg", oversized, "image/jpeg")},
    )
    assert response.status_code == 413
    assert storage.objects == set()
