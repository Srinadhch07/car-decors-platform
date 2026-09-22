"""Declarative MongoDB index definitions and idempotent initialization."""

from dataclasses import dataclass, field

from pymongo import ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

# Index key type accepted by PyMongo: a single field or an ordered key list.
IndexKeys = str | list[tuple[str, int]]


@dataclass(frozen=True)
class IndexSpec:
    """A single index to create on a collection."""

    keys: IndexKeys
    name: str
    unique: bool = False
    options: dict = field(default_factory=dict)


#: Indexes justified by the approved architecture.
INDEX_DEFINITIONS: dict[str, tuple[IndexSpec, ...]] = {
    "admin_users": (IndexSpec([("email", ASCENDING)], name="uq_admin_users_email", unique=True),),
    "categories": (
        IndexSpec([("slug", ASCENDING)], name="uq_categories_slug", unique=True),
        IndexSpec(
            [("is_active", ASCENDING), ("sort_order", ASCENDING)],
            name="ix_categories_active_sort",
        ),
    ),
    "subcategories": (
        IndexSpec(
            [("category_id", ASCENDING), ("slug", ASCENDING)],
            name="uq_subcategories_category_slug",
            unique=True,
        ),
        IndexSpec(
            [("is_active", ASCENDING), ("sort_order", ASCENDING)],
            name="ix_subcategories_active_sort",
        ),
    ),
    "products": (
        IndexSpec([("slug", ASCENDING)], name="uq_products_slug", unique=True),
        IndexSpec([("category_id", ASCENDING)], name="ix_products_category"),
        IndexSpec([("subcategory_id", ASCENDING)], name="ix_products_subcategory"),
        IndexSpec(
            [("is_active", ASCENDING), ("availability", ASCENDING)],
            name="ix_products_active_availability",
        ),
        IndexSpec(
            [("is_active", ASCENDING), ("created_at", DESCENDING)],
            name="ix_products_active_created",
        ),
        IndexSpec([("vehicle_tags", ASCENDING)], name="ix_products_vehicle_tags"),
    ),
}


async def ensure_indexes(database: AsyncDatabase) -> dict[str, list[str]]:
    """Create all declared indexes, safely repeatable.

    ``create_index`` is a no-op when an identical index already exists, so this
    can run on every startup. Returns the index names created per collection.
    """
    created: dict[str, list[str]] = {}
    for collection_name, specs in INDEX_DEFINITIONS.items():
        collection = database[collection_name]
        names: list[str] = []
        for spec in specs:
            name = await collection.create_index(
                spec.keys,
                name=spec.name,
                unique=spec.unique,
                **spec.options,
            )
            names.append(name)
        created[collection_name] = names
    return created
