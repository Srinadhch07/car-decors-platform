"""Tests for index definitions and idempotent index initialization."""

import pytest
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.db.indexes import INDEX_DEFINITIONS, ensure_indexes
from app.models.category import Category
from app.models.product import Product
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from tests.support.mongomock_async import AsyncDatabase


async def test_all_collections_have_declared_indexes(fake_db: AsyncDatabase) -> None:
    assert set(INDEX_DEFINITIONS) == {
        "admin_users",
        "categories",
        "subcategories",
        "products",
    }


async def test_ensure_indexes_creates_expected_names(fake_db: AsyncDatabase) -> None:
    created = await ensure_indexes(fake_db)

    expected = {
        "admin_users": ["uq_admin_users_email"],
        "categories": ["uq_categories_slug", "ix_categories_active_sort"],
        "subcategories": ["uq_subcategories_category_slug", "ix_subcategories_active_sort"],
        "products": [
            "uq_products_slug",
            "ix_products_category",
            "ix_products_subcategory",
            "ix_products_active_availability",
            "ix_products_active_created",
            "ix_products_vehicle_tags",
        ],
    }
    assert created == expected


async def test_ensure_indexes_is_idempotent(fake_db: AsyncDatabase) -> None:
    await ensure_indexes(fake_db)
    await ensure_indexes(fake_db)  # must not raise

    assert await ensure_indexes(fake_db) is not None


async def test_unique_category_slug_is_enforced(fake_db: AsyncDatabase) -> None:
    await ensure_indexes(fake_db)
    repo = CategoryRepository(fake_db)

    await repo.create(Category(name="Interior", slug="interior"))
    with pytest.raises(DuplicateKeyError):
        await repo.create(Category(name="Other", slug="interior"))


async def test_unique_product_slug_is_enforced(fake_db: AsyncDatabase) -> None:
    await ensure_indexes(fake_db)
    repo = ProductRepository(fake_db)

    await repo.create(Product(category_id=ObjectId(), name="Seat", slug="seat-cover"))
    with pytest.raises(DuplicateKeyError):
        await repo.create(Product(category_id=ObjectId(), name="Other", slug="seat-cover"))


async def test_indexes_are_visible_via_list_indexes(fake_db: AsyncDatabase) -> None:
    await ensure_indexes(fake_db)

    names = [index["name"] async for index in fake_db["products"].list_indexes()]

    assert "uq_products_slug" in names
    assert "ix_products_vehicle_tags" in names
