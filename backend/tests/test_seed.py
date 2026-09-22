"""Tests for the idempotent seed mechanism."""

from app.core.security import verify_password
from app.db.indexes import ensure_indexes
from app.models.shop_settings import ShopSettings
from app.repositories.admin_users import AdminUserRepository
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.shop_settings import ShopSettingsRepository
from app.repositories.subcategories import SubcategoryRepository
from app.seed import run_seed, seed_admin_user, seed_sample_data, seed_shop_settings
from tests.support.mongomock_async import AsyncDatabase


async def test_seed_admin_user_is_idempotent(fake_db: AsyncDatabase) -> None:
    await ensure_indexes(fake_db)

    assert await seed_admin_user(fake_db, email="admin@example.com", password_hash="hash") is True
    assert await seed_admin_user(fake_db, email="admin@example.com", password_hash="hash") is False

    repo = AdminUserRepository(fake_db)
    assert await repo.count() == 1
    assert (await repo.get_by_email("admin@example.com")).password_hash == "hash"


async def test_seed_shop_settings_is_idempotent_and_preserves_values(
    fake_db: AsyncDatabase,
) -> None:
    settings = ShopSettings(shop_name="Car Decor Shop", whatsapp_number="+91-000")

    assert await seed_shop_settings(fake_db, settings) is True
    assert await seed_shop_settings(fake_db, ShopSettings(shop_name="Different")) is False

    stored = await ShopSettingsRepository(fake_db).get()
    assert stored.shop_name == "Car Decor Shop"
    assert stored.whatsapp_number == "+91-000"


async def test_seed_sample_data_is_idempotent(fake_db: AsyncDatabase) -> None:
    first = await seed_sample_data(fake_db)
    second = await seed_sample_data(fake_db)

    assert first.categories_created == 2
    assert first.subcategories_created == 3
    assert first.products_created == 3

    assert second.categories_created == 0
    assert second.subcategories_created == 0
    assert second.products_created == 0

    assert await CategoryRepository(fake_db).count() == 2
    assert await SubcategoryRepository(fake_db).count() == 3
    assert await ProductRepository(fake_db).count() == 3


async def test_run_seed_creates_admin_and_settings(fake_db: AsyncDatabase) -> None:
    summary = await run_seed(
        fake_db,
        admin_email="owner@shop.com",
        admin_password="dev-password",
        include_sample_data=True,
    )

    assert summary.admin_created is True
    assert summary.shop_settings_created is True
    assert summary.categories_created == 2
    assert summary.products_created == 3

    rerun = await run_seed(
        fake_db,
        admin_email="owner@shop.com",
        admin_password="dev-password",
        include_sample_data=True,
    )
    assert rerun.admin_created is False
    assert rerun.shop_settings_created is False
    assert rerun.categories_created == 0


async def test_run_seed_hashes_plaintext_password(fake_db: AsyncDatabase) -> None:
    await run_seed(fake_db, admin_email="admin@example.com", admin_password="s3cret")

    stored = await AdminUserRepository(fake_db).get_by_email("admin@example.com")
    assert stored.password_hash != "s3cret"
    assert stored.password_hash.startswith("$argon2")
    assert verify_password("s3cret", stored.password_hash) is True
    assert verify_password("wrong", stored.password_hash) is False


async def test_seeded_products_are_findable(fake_db: AsyncDatabase) -> None:
    await ensure_indexes(fake_db)
    await run_seed(
        fake_db,
        admin_email="admin@example.com",
        admin_password="dev-password",
        include_sample_data=True,
    )

    repo = ProductRepository(fake_db)
    sample = await repo.get_by_slug("all-weather-floor-mats")

    assert sample is not None
    assert sample.availability.value == "IN_STOCK"
    assert "Maruti Swift 2018-2023" in sample.vehicle_tags
