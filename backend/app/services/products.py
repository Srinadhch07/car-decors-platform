"""Product service: business rules for products, images, and discovery.

Routers stay thin; every product rule (references, slugs, visibility, image
lifecycle, search/filter/sort/pagination) lives here.
"""

import logging
import math
import re
from decimal import Decimal
from typing import Any

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.slugs import find_available_slug, slugify
from app.models.enums import Availability
from app.models.product import Product, ProductCreate, ProductListPage, ProductRead, ProductUpdate
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.subcategories import SubcategoryRepository
from app.storage.base import Storage, StorageError, is_product_key

logger = logging.getLogger(__name__)

#: Whitelisted sort values mapped to MongoDB sort keys.
SORT_KEYS: dict[str, list[tuple[str, int]] | str] = {
    "newest": [("created_at", -1), ("_id", -1)],
    "oldest": [("created_at", 1), ("_id", 1)],
    "name_asc": [("name", 1), ("_id", 1)],
    "name_desc": [("name", -1), ("_id", 1)],
    "price_asc": "price_asc",
    "price_desc": "price_desc",
}

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20


class ProductError(Exception):
    """Base class for product domain errors."""


class NotFoundError(ProductError):
    """A requested product does not exist."""


class ConflictError(ProductError):
    """A uniqueness or integrity constraint was violated."""


class InvalidReferenceError(ProductError):
    """An input references a category/subcategory that does not exist."""


class InvalidQueryError(ProductError):
    """A pagination or sort parameter is invalid."""


def _read_product(product: Product) -> ProductRead:
    return ProductRead.model_validate(product)


async def _require_valid_category(database: AsyncDatabase, category_id: ObjectId) -> None:
    category = await CategoryRepository(database).get_by_id(category_id)
    if category is None:
        raise InvalidReferenceError("Category does not exist")


async def _require_valid_subcategory(
    database: AsyncDatabase, category_id: ObjectId, subcategory_id: ObjectId | None
) -> None:
    if subcategory_id is None:
        return
    subcategory = await SubcategoryRepository(database).get_by_id(subcategory_id)
    if subcategory is None:
        raise InvalidReferenceError("Subcategory does not exist")
    if subcategory.category_id != category_id:
        raise InvalidReferenceError("Subcategory does not belong to the product's category")


def _price_key(product: Product) -> tuple:
    """Deterministic sort key; unpriced products always sort last."""
    price = product.price.to_decimal() if product.price is not None else Decimal(0)
    return (0 if product.price is None else 1, price, product.name.lower(), product.slug)


def _validate_pagination(page: int, page_size: int) -> tuple[int, int, int]:
    if page < 1:
        raise InvalidQueryError("page must be >= 1")
    if page_size < 1:
        raise InvalidQueryError("page_size must be >= 1")
    if page_size > MAX_PAGE_SIZE:
        raise InvalidQueryError(f"page_size must be <= {MAX_PAGE_SIZE}")
    return (page - 1) * page_size, page, page_size


def _total_pages(total: int, page_size: int) -> int:
    if total == 0:
        return 0
    return math.ceil(total / page_size)


def _search_condition(term: str) -> dict[str, Any]:
    """Search across name/description/vehicle tags with escaped regex."""
    expression = re.compile(re.escape(term), re.IGNORECASE)
    return {
        "$or": [
            {"name": {"$regex": expression}},
            {"description": {"$regex": expression}},
            {"vehicle_tags": {"$elemMatch": {"$regex": expression}}},
        ]
    }


def _vehicle_condition(term: str) -> dict[str, Any]:
    return {"vehicle_tags": {"$elemMatch": {"$regex": re.compile(re.escape(term), re.IGNORECASE)}}}


def _build_page(items: list[Product], total: int, *, page: int, page_size: int) -> ProductListPage:
    return ProductListPage(
        items=[_read_product(product) for product in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=_total_pages(total, page_size),
    )


async def _resolve_page(
    database: AsyncDatabase,
    query: dict[str, Any],
    *,
    sort: str,
    page: int,
    page_size: int,
) -> ProductListPage:
    if sort not in SORT_KEYS:
        raise InvalidQueryError(f"sort must be one of: {', '.join(sorted(SORT_KEYS))}")
    skip, resolved_page, resolved_size = _validate_pagination(page, page_size)
    repository = ProductRepository(database)

    total = await repository.count_query(query)
    if sort in ("price_asc", "price_desc"):
        products = await repository.fetch_query(query)
        priced = [p for p in products if p.price is not None]
        unpriced = [p for p in products if p.price is None]
        priced = sorted(
            priced,
            key=lambda p: (p.price.to_decimal(), p.name.lower(), p.slug),  # type: ignore[union-attr]
            reverse=(sort == "price_desc"),
        )
        products = priced + unpriced
        items = products[skip : skip + resolved_size]
    else:
        items = await repository.page_query(
            query, sort_keys=SORT_KEYS[sort], skip=skip, limit=resolved_size
        )
    return _build_page(items, total, page=resolved_page, page_size=resolved_size)


# ---------------------------------------------------------------------------
# Admin: CRUD
# ---------------------------------------------------------------------------


async def create_product(
    database: AsyncDatabase,
    storage: Storage,
    payload: ProductCreate,
    uploaded_image=None,
) -> ProductRead:
    """Create a product, uploading an optional image first.

    If the database write fails the just-uploaded image is removed so failed
    creates never leak objects into storage.
    """
    await _require_valid_category(database, payload.category_id)
    await _require_valid_subcategory(database, payload.category_id, payload.subcategory_id)

    base_slug = slugify(payload.name)
    if not base_slug:
        raise InvalidReferenceError(
            "Could not generate a slug from the name; the name needs Latin characters"
        )
    repository = ProductRepository(database)
    slug = await find_available_slug(base_slug, is_taken=repository.is_slug_taken)

    image_url: str | None = None
    image_key: str | None = None
    if uploaded_image is not None:
        await storage.upload(uploaded_image.key, uploaded_image.data, uploaded_image.content_type)
        image_key = uploaded_image.key
        image_url = storage.public_url(uploaded_image.key)

    product = Product(
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        name=payload.name,
        slug=slug,
        description=payload.description,
        price=payload.price,
        availability=payload.availability,
        is_active=payload.is_active,
        vehicle_tags=payload.vehicle_tags,
        image_url=image_url,
    )
    try:
        created = await repository.create(product)
    except DuplicateKeyError as exc:
        if image_key is not None:
            await _safe_cleanup(storage, image_key)
        raise ConflictError(
            "A product with that slug already exists; try renaming before creating"
        ) from exc
    except Exception:
        if image_key is not None:
            await _safe_cleanup(storage, image_key)
        raise
    return _read_product(created)


async def update_product(
    database: AsyncDatabase,
    storage: Storage,
    product_id: ObjectId,
    payload: ProductUpdate,
    uploaded_image=None,
) -> ProductRead:
    """Update a product and its image.

    Replacement sequence: validate -> upload the new image -> persist in MongoDB
    -> delete the old image. The old image is never removed before the new one
    is safely stored, and a failed MongoDB write keeps the database pointing at
    the previous image.
    """
    repository = ProductRepository(database)
    existing = await repository.get_by_id(product_id)
    if existing is None:
        raise NotFoundError("Product not found")

    changes = payload.model_dump(exclude_unset=True)

    new_category_id = changes.get("category_id", existing.category_id)
    if "category_id" in changes:
        await _require_valid_category(database, new_category_id)
    if "subcategory_id" in changes:
        new_subcategory_id = changes["subcategory_id"]
        await _require_valid_subcategory(database, new_category_id, new_subcategory_id)
    elif existing.subcategory_id is not None and new_category_id != existing.category_id:
        await _require_valid_subcategory(database, new_category_id, existing.subcategory_id)

    new_image_url: str | None = existing.image_url
    new_image_key: str | None = None
    old_image_key: str | None = None
    if uploaded_image is not None:
        await storage.upload(uploaded_image.key, uploaded_image.data, uploaded_image.content_type)
        new_image_key = uploaded_image.key
        new_image_url = storage.public_url(uploaded_image.key)
        old_image_key = (
            storage.extract_key_from_url(existing.image_url) if existing.image_url else None
        )

    if new_image_url != existing.image_url:
        changes["image_url"] = new_image_url

    try:
        await repository.update(existing.id, changes)
    except DuplicateKeyError as exc:
        if new_image_key is not None:
            await _safe_cleanup(storage, new_image_key)
        raise ConflictError("A product slug conflict prevented the update") from exc
    except Exception:
        if new_image_key is not None:
            await _safe_cleanup(storage, new_image_key)
        raise

    if new_image_key is not None and is_product_key(old_image_key):
        await storage.delete(old_image_key)  # type: ignore[arg-type]

    updated = await repository.get_by_id(existing.id)
    if updated is None:  # pragma: no cover - defensive
        raise NotFoundError("Product not found")
    return _read_product(updated)


async def delete_product(database: AsyncDatabase, storage: Storage, product_id: ObjectId) -> None:
    """Delete a product and its stored image.

    The row is removed first; if image cleanup then fails a storage error is
    surfaced so the API never reports a fully successful deletion that was not.
    """
    repository = ProductRepository(database)
    existing = await repository.get_by_id(product_id)
    if existing is None:
        raise NotFoundError("Product not found")

    await repository.delete(existing.id)

    if existing.image_url:
        key = storage.extract_key_from_url(existing.image_url)
        if is_product_key(key):
            await storage.delete(key)
        else:
            logger.info("Skipping storage cleanup for non-product image URL %r", existing.image_url)


async def _safe_cleanup(storage: Storage, key: str) -> None:
    try:
        await storage.delete(key)
    except StorageError as exc:  # pragma: no cover - best-effort orphan cleanup
        logger.warning("Failed to clean up uploaded image %s: %s", key, exc)


# ---------------------------------------------------------------------------
# Admin: listing / discovery
# ---------------------------------------------------------------------------


async def _resolve_category_slug(
    database: AsyncDatabase, slug: str, *, exclude_inactive: bool
) -> list[ObjectId]:
    category = await CategoryRepository(database).get_by_slug(slug)
    if category is None:
        return []
    if exclude_inactive and not category.is_active:
        return []
    return [category.id]


async def _resolve_subcategory_slug(
    database: AsyncDatabase, slug: str, category_scope: list[ObjectId] | None
) -> list[ObjectId]:
    """Resolve a subcategory slug to ids, honoring an optional category scope.

    Subcategory slugs are unique within a category but may repeat across
    categories, so every matching active parent scope is a valid target.
    """
    query: dict[str, Any] = {"slug": slug}
    if category_scope is not None:
        if not category_scope:
            return []
        query["category_id"] = {"$in": category_scope}
    subcategories = await SubcategoryRepository(database).list_with_query(query)
    return [subcategory.id for subcategory in subcategories if subcategory.id is not None]


async def list_admin_products(
    database: AsyncDatabase,
    *,
    search: str | None = None,
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
    availability: Availability | None = None,
    is_active: bool | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> ProductListPage:
    """Full product view for the admin, including inactive rows."""
    query: dict[str, Any] = {}
    conditions: list[dict[str, Any]] = []

    category_scope: list[ObjectId] | None = None
    if category_slug:
        category_scope = await _resolve_category_slug(
            database, category_slug, exclude_inactive=False
        )
        if not category_scope:
            return _empty_page(page, page_size)
        query["category_id"] = {"$in": category_scope}

    if subcategory_slug:
        subcategory_ids = await _resolve_subcategory_slug(
            database, subcategory_slug, category_scope
        )
        if not subcategory_ids:
            return _empty_page(page, page_size)
        query["subcategory_id"] = {"$in": subcategory_ids}

    if availability is not None:
        query["availability"] = availability.value
    if is_active is not None:
        query["is_active"] = is_active

    if search:
        conditions.append(_search_condition(search))
    if conditions:
        query["$and"] = conditions
    return await _resolve_page(database, query, sort=sort, page=page, page_size=page_size)


async def list_public_products(
    database: AsyncDatabase,
    *,
    search: str | None = None,
    category_slug: str | None = None,
    subcategory_slug: str | None = None,
    vehicle: str | None = None,
    availability: Availability | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> ProductListPage:
    """Public catalog: active products of active categories only.

    A product is visible when itself active, its category is active, and — when
    it has a subcategory — that subcategory is active too.
    """
    category_repository = CategoryRepository(database)
    subcategory_repository = SubcategoryRepository(database)

    active_categories = await category_repository.list_active()
    active_category_ids = {category.id for category in active_categories if category.id is not None}

    category_scope: list[ObjectId] | None = None
    if category_slug:
        category = await category_repository.get_by_slug(category_slug)
        if category is None or not category.is_active or category.id is None:
            return _empty_page(page, page_size)
        category_scope = [category.id]
        active_category_ids = {category.id}

    active_subcategories = [
        subcategory
        for subcategory in await subcategory_repository.list_with_query({"is_active": True})
        if subcategory.category_id in active_category_ids and subcategory.id is not None
    ]
    visible_subcategory_ids = {subcategory.id for subcategory in active_subcategories}

    query: dict[str, Any] = {"is_active": True}
    conditions: list[dict[str, Any]] = []

    query["category_id"] = {"$in": list(active_category_ids)}

    if subcategory_slug:
        subcategory_ids = await _resolve_subcategory_slug(
            database, subcategory_slug, category_scope
        )
        if not subcategory_ids:
            return _empty_page(page, page_size)
        subcategory_ids = [
            subcategory_id
            for subcategory_id in subcategory_ids
            if subcategory_id in visible_subcategory_ids
        ]
        if not subcategory_ids:
            return _empty_page(page, page_size)
        query["subcategory_id"] = {"$in": subcategory_ids}
    else:
        visible_conditions: list[dict[str, Any]] = [{"subcategory_id": None}]
        if visible_subcategory_ids:
            visible_conditions.append({"subcategory_id": {"$in": list(visible_subcategory_ids)}})
        conditions.append({"$or": visible_conditions})

    if availability is not None:
        query["availability"] = availability.value
    if vehicle:
        query.update(_vehicle_condition(vehicle))
    if search:
        conditions.append(_search_condition(search))
    if conditions:
        query["$and"] = conditions
    return await _resolve_page(database, query, sort=sort, page=page, page_size=page_size)


def _empty_page(page: int, page_size: int) -> ProductListPage:
    _, resolved_page, resolved_size = _validate_pagination(page, page_size)
    return _build_page([], 0, page=resolved_page, page_size=resolved_size)


async def get_admin_product(database: AsyncDatabase, product_id: ObjectId) -> ProductRead:
    product = await ProductRepository(database).get_by_id(product_id)
    if product is None:
        raise NotFoundError("Product not found")
    return _read_product(product)


async def get_public_product(database: AsyncDatabase, slug: str) -> ProductRead:
    """Public detail: honors full visibility rules (product + category + sub)."""
    product = await ProductRepository(database).get_by_slug(slug)
    if product is None or not product.is_active:
        raise NotFoundError("Product not found")

    category = await CategoryRepository(database).get_by_id(product.category_id)
    if category is None or not category.is_active:
        raise NotFoundError("Product not found")

    if product.subcategory_id is not None:
        subcategory = await SubcategoryRepository(database).get_by_id(product.subcategory_id)
        if subcategory is None or not subcategory.is_active:
            raise NotFoundError("Product not found")

    return _read_product(product)


__all__ = [
    "ConflictError",
    "InvalidQueryError",
    "InvalidReferenceError",
    "NotFoundError",
    "ProductError",
    "SORT_KEYS",
    "create_product",
    "delete_product",
    "get_admin_product",
    "get_public_product",
    "list_admin_products",
    "list_public_products",
    "update_product",
]
