"""Behavior tests for the repository/data-access layer."""

import pytest
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.db.indexes import ensure_indexes
from app.models import Availability
from app.models.admin_user import AdminUser
from app.models.category import Category
from app.models.product import Product
from app.models.shop_settings import ShopSettings
from app.models.subcategory import Subcategory
from app.repositories.admin_users import AdminUserRepository
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.shop_settings import SHOP_SETTINGS_ID, ShopSettingsRepository
from app.repositories.subcategories import SubcategoryRepository
from tests.support.mongomock_async import AsyncDatabase


async def test_category_crud_round_trip(fake_db: AsyncDatabase) -> None:
    repo = CategoryRepository(fake_db)

    created = await repo.create(Category(name="Interior", slug="interior", sort_order=2))
    assert created.id is not None

    fetched_by_id = await repo.get_by_id(created.id)
    assert fetched_by_id is not None
    assert fetched_by_id.name == "Interior"

    fetched_by_slug = await repo.get_by_slug("interior")
    assert fetched_by_slug is not None
    assert fetched_by_slug.id == created.id

    updated = await repo.update(created.id, {"sort_order": 5})
    assert updated is True
    assert (await repo.get_by_id(created.id)).sort_order == 5

    assert (await repo.count()) == 1
    assert (await repo.list()) == [await repo.get_by_id(created.id)]

    assert await repo.delete(created.id) is True
    assert await repo.get_by_id(created.id) is None


async def test_category_list_active_respects_filter(fake_db: AsyncDatabase) -> None:
    repo = CategoryRepository(fake_db)
    await repo.create(Category(name="Active", slug="active", sort_order=1))
    await repo.create(Category(name="Hidden", slug="hidden", is_active=False))

    active = await repo.list_active()

    assert [category.slug for category in active] == ["active"]


async def test_admin_user_unique_email_enforced(fake_db: AsyncDatabase) -> None:
    await ensure_indexes(fake_db)
    repo = AdminUserRepository(fake_db)

    await repo.create(AdminUser(email="admin@example.com", password_hash="hash"))
    with pytest.raises(DuplicateKeyError):
        await repo.create(AdminUser(email="ADMIN@example.com", password_hash="other"))

    found = await repo.get_by_email("admin@example.com")
    assert found is not None
    assert found.password_hash == "hash"


async def test_shop_settings_singleton(fake_db: AsyncDatabase) -> None:
    repo = ShopSettingsRepository(fake_db)

    assert await repo.get() is None

    first_created = await repo.create_if_absent(ShopSettings(shop_name="Car Decor Shop"))
    assert first_created is True

    second_created = await repo.create_if_absent(ShopSettings(shop_name="Different"))
    assert second_created is False

    settings = await repo.get()
    assert settings is not None
    assert settings.shop_name == "Car Decor Shop"
    assert settings.id == SHOP_SETTINGS_ID

    updated = await repo.update_fields({"phone": "123-456"})
    assert updated is True
    assert (await repo.get()).phone == "123-456"
    assert (await repo.get()).shop_name == "Car Decor Shop"


async def test_subcategory_lists_by_category(fake_db: AsyncDatabase) -> None:
    category_id = ObjectId()
    repo = SubcategoryRepository(fake_db)
    await repo.create(Subcategory(category_id=category_id, name="B", slug="b", sort_order=2))
    await repo.create(
        Subcategory(category_id=category_id, name="A", slug="a", sort_order=1, is_active=False)
    )
    await repo.create(Subcategory(category_id=ObjectId(), name="Other", slug="other"))

    all_in_category = [s.slug for s in await repo.list_by_category(category_id)]
    assert all_in_category == ["a", "b"]

    active_only = [s.slug for s in await repo.list_by_category(category_id, active_only=True)]
    assert active_only == ["b"]


async def test_product_repo_relationships(fake_db: AsyncDatabase) -> None:
    category_id = ObjectId()
    subcategory_id = ObjectId()
    repo = ProductRepository(fake_db)

    in_stock = await repo.create(
        Product(
            category_id=category_id,
            subcategory_id=subcategory_id,
            name="Mats",
            slug="mats",
            availability=Availability.IN_STOCK,
        )
    )
    await repo.create(
        Product(category_id=category_id, name="Hidden", slug="hidden", is_active=False)
    )
    other = await repo.create(Product(category_id=ObjectId(), name="Other", slug="other"))

    assert (await repo.get_by_slug("mats")).id == in_stock.id
    assert {p.slug for p in await repo.list_by_category(category_id)} == {"mats", "hidden"}
    assert [p.slug for p in await repo.list_by_category(category_id, active_only=True)] == ["mats"]
    assert [p.slug for p in await repo.list_by_subcategory(subcategory_id)] == ["mats"]
    assert (await repo.get_by_id(other.id)).slug == "other"


async def test_update_rejects_empty_changes(fake_db: AsyncDatabase) -> None:
    repo = CategoryRepository(fake_db)
    created = await repo.create(Category(name="Interior", slug="interior"))

    assert await repo.update(created.id, {}) is False
