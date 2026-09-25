"""Tests for the public SEO sitemap endpoint."""

from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from pymongo.errors import ConnectionFailure

from app.core.config import get_settings
from app.db.dependencies import get_database
from app.main import create_app
from app.models import Availability
from app.models.category import Category
from app.models.product import Product
from app.models.subcategory import Subcategory
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.subcategories import SubcategoryRepository
from tests.support.mongomock_async import AsyncDatabase


async def _seed(fake_db: AsyncDatabase) -> tuple[ObjectId, ObjectId, ObjectId]:
    categories = CategoryRepository(fake_db)
    subcategories = SubcategoryRepository(fake_db)
    products = ProductRepository(fake_db)

    interior = await categories.create(Category(name="Interior", slug="interior", sort_order=1))
    exterior = await categories.create(Category(name="Exterior", slug="exterior", sort_order=2))
    hidden_category = await categories.create(
        Category(name="Secret", slug="secret", is_active=False)
    )

    cushions = await subcategories.create(
        Subcategory(category_id=interior.id, name="Cushions", slug="cushions")
    )
    await subcategories.create(
        Subcategory(category_id=hidden_category.id, name="Hidden Sub", slug="hidden-sub")
    )
    await subcategories.create(
        Subcategory(
            category_id=interior.id,
            name="Retired",
            slug="retired",
            is_active=False,
        )
    )

    seat_cover = await products.create(
        Product(
            category_id=interior.id,
            subcategory_id=cushions.id,
            name="Seat Cover",
            slug="seat-cover",
            price="9999",
            availability=Availability.IN_STOCK,
        )
    )
    await products.create(
        Product(
            category_id=interior.id,
            subcategory_id=None,
            name="Floor Mat",
            slug="floor-mat",
            price="1999",
            availability=Availability.IN_STOCK,
        )
    )
    await products.create(
        Product(
            category_id=exterior.id,
            name="Hidden Exterior Product",
            slug="hidden-exterior-product",
            is_active=False,
        )
    )
    await products.create(
        Product(
            category_id=hidden_category.id,
            name="Under Hidden Category",
            slug="under-hidden-category",
        )
    )
    await products.create(
        Product(
            category_id=interior.id,
            subcategory_id=cushions.id,
            name="Retired Sub Product",
            slug="retired-sub-product",
            is_active=False,
        )
    )
    return interior.id, cushions.id, seat_cover.id


def _sitemap_client(fake_db: AsyncDatabase) -> AsyncClient:
    test_app = create_app()
    test_app.dependency_overrides[get_database] = lambda: fake_db
    return AsyncClient(transport=ASGITransport(app=test_app), base_url="http://testserver")


async def test_sitemap_lists_public_urls_only(fake_db: AsyncDatabase) -> None:
    await _seed(fake_db)
    base = get_settings().frontend_url.rstrip("/")
    async with _sitemap_client(fake_db) as async_client:
        response = await async_client.get("/sitemap.xml")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    body = response.text

    assert '<?xml version="1.0" encoding="UTF-8"?>' in body
    assert "sitemaps.org/schemas/sitemap/0.9" in body

    expected_paths = (
        "/",
        "/products",
        "/about",
        "/contact",
        "/categories/interior",
        "/categories/exterior",
    )
    for path in expected_paths:
        assert f"<loc>{base}{path}</loc>" in body

    assert f"<loc>{base}/products/seat-cover</loc>" in body
    assert f"<loc>{base}/products/floor-mat</loc>" in body
    assert "<lastmod>" in body

    assert "/categories/secret" not in body
    assert "/hidden-exterior-product" not in body
    assert "/under-hidden-category" not in body
    assert "/retired-sub-product" not in body
    assert "/admin" not in body


async def test_sitemap_degrades_gracefully_without_database() -> None:
    class BrokenDatabase:
        def __getitem__(self, _name: str):
            raise ConnectionFailure("simulated outage")

    test_app = create_app()
    test_app.dependency_overrides[get_database] = lambda: BrokenDatabase()
    async with AsyncClient(
        transport=ASGITransport(app=test_app), base_url="http://testserver"
    ) as async_client:
        response = await async_client.get("/sitemap.xml")

    assert response.status_code == 503
    assert "unavailable" in response.text.lower()