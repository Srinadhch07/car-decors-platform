"""Idempotent seeding of the admin user, shop settings, and optional sample data."""

from dataclasses import dataclass

from pymongo.asynchronous.database import AsyncDatabase

from app.core.security import hash_password
from app.models.base import utc_now
from app.models.category import Category
from app.models.enums import Availability
from app.models.product import Product
from app.models.shop_settings import ShopSettings
from app.models.subcategory import Subcategory
from app.repositories.admin_users import AdminUserRepository
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.shop_settings import ShopSettingsRepository
from app.repositories.subcategories import SubcategoryRepository


@dataclass
class SeedSummary:
    """Outcome of a seed run; counts reflect newly created documents only."""

    admin_created: bool = False
    shop_settings_created: bool = False
    categories_created: int = 0
    subcategories_created: int = 0
    products_created: int = 0


async def seed_admin_user(database: AsyncDatabase, *, email: str, password_hash: str) -> bool:
    """Create the admin account if it does not already exist.

    ``password_hash`` must be pre-hashed (Argon2id); hashing happens in
    :func:`run_seed` for plaintext passwords. Existing accounts are never
    modified.
    """
    normalized_email = email.strip().lower()
    timestamp = utc_now()
    result = await database["admin_users"].update_one(
        {"email": normalized_email},
        {
            "$setOnInsert": {
                "email": normalized_email,
                "password_hash": password_hash,
                "created_at": timestamp,
                "updated_at": timestamp,
            }
        },
        upsert=True,
    )
    return result.upserted_id is not None


async def seed_shop_settings(database: AsyncDatabase, settings: ShopSettings) -> bool:
    """Create the singleton shop settings document if absent."""
    return await ShopSettingsRepository(database).create_if_absent(settings)


_SAMPLE_CATEGORIES: tuple[dict, ...] = (
    {"name": "Interior", "slug": "interior", "sort_order": 1},
    {"name": "Exterior", "slug": "exterior", "sort_order": 2},
)

_SAMPLE_SUBCATEGORIES: tuple[dict, ...] = (
    {"category": "interior", "name": "Seat Covers", "slug": "seat-covers", "sort_order": 1},
    {"category": "interior", "name": "Floor Mats", "slug": "floor-mats", "sort_order": 2},
    {"category": "exterior", "name": "Body Kits", "slug": "body-kits", "sort_order": 1},
)

_SAMPLE_PRODUCTS: tuple[dict, ...] = (
    {
        "category": "interior",
        "subcategory": "seat-covers",
        "name": "Leather Seat Cover Set",
        "slug": "leather-seat-cover-set",
        "price": "2499.00",
        "availability": Availability.IN_STOCK,
        "vehicle_tags": ["Toyota Corolla 2015-2020", "Honda Civic 2016-2021"],
    },
    {
        "category": "interior",
        "subcategory": "floor-mats",
        "name": "All-Weather Floor Mats",
        "slug": "all-weather-floor-mats",
        "price": "1299.00",
        "availability": Availability.IN_STOCK,
        "vehicle_tags": ["Maruti Swift 2018-2023"],
    },
    {
        "category": "exterior",
        "subcategory": "body-kits",
        "name": "Front Bumper Lip",
        "slug": "front-bumper-lip",
        "price": None,
        "availability": Availability.ON_ORDER,
        "vehicle_tags": ["Hyundai i20 2020-2024"],
    },
)


async def seed_sample_data(database: AsyncDatabase) -> SeedSummary:
    """Create sample categories, subcategories, and products if absent.

    Matching is by slug, so repeated runs never duplicate data.
    """
    summary = SeedSummary()
    category_repo = CategoryRepository(database)
    subcategory_repo = SubcategoryRepository(database)
    product_repo = ProductRepository(database)

    category_ids = {}
    for entry in _SAMPLE_CATEGORIES:
        existing = await category_repo.get_by_slug(entry["slug"])
        if existing is not None:
            category_ids[entry["slug"]] = existing.id
            continue
        created = await category_repo.create(
            Category(
                name=entry["name"],
                slug=entry["slug"],
                sort_order=entry["sort_order"],
            )
        )
        category_ids[entry["slug"]] = created.id
        summary.categories_created += 1

    subcategory_ids = {}
    for entry in _SAMPLE_SUBCATEGORIES:
        existing = await subcategory_repo.get_by_slug(entry["slug"])
        if existing is not None:
            subcategory_ids[entry["slug"]] = existing.id
            continue
        created = await subcategory_repo.create(
            Subcategory(
                category_id=category_ids[entry["category"]],
                name=entry["name"],
                slug=entry["slug"],
                sort_order=entry["sort_order"],
            )
        )
        subcategory_ids[entry["slug"]] = created.id
        summary.subcategories_created += 1

    for entry in _SAMPLE_PRODUCTS:
        existing = await product_repo.get_by_slug(entry["slug"])
        if existing is not None:
            continue
        await product_repo.create(
            Product(
                category_id=category_ids[entry["category"]],
                subcategory_id=subcategory_ids[entry["subcategory"]],
                name=entry["name"],
                slug=entry["slug"],
                price=entry["price"],
                availability=entry["availability"],
                vehicle_tags=entry["vehicle_tags"],
                image_url=f"/media/samples/{entry['slug']}.jpg",
            )
        )
        summary.products_created += 1

    return summary


async def run_seed(
    database: AsyncDatabase,
    *,
    admin_email: str,
    admin_password: str | None = None,
    admin_password_hash: str | None = None,
    shop_settings: ShopSettings | None = None,
    include_sample_data: bool = False,
) -> SeedSummary:
    """Seed the admin user, shop settings, and optionally sample data.

    Provide ``admin_password`` (hashed here with Argon2id) or a pre-computed
    ``admin_password_hash``; one of the two is required.
    """
    if admin_password_hash is None and admin_password is not None:
        admin_password_hash = hash_password(admin_password)
    if admin_password_hash is None:
        raise ValueError("Provide admin_password or admin_password_hash")

    summary = SeedSummary()
    summary.admin_created = await seed_admin_user(
        database, email=admin_email, password_hash=admin_password_hash
    )
    settings = shop_settings or ShopSettings(shop_name="Car Decor Shop")
    summary.shop_settings_created = await seed_shop_settings(database, settings)

    if include_sample_data:
        sample = await seed_sample_data(database)
        summary.categories_created = sample.categories_created
        summary.subcategories_created = sample.subcategories_created
        summary.products_created = sample.products_created

    return summary


__all__ = [
    "AdminUserRepository",
    "SeedSummary",
    "run_seed",
    "seed_admin_user",
    "seed_sample_data",
    "seed_shop_settings",
]
