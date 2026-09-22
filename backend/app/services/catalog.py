"""Catalog service layer: category/subcategory rules and uniqueness."""

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.slugs import find_available_slug, slugify
from app.models.category import Category, CategoryCreate, CategoryRead, CategoryUpdate
from app.models.subcategory import (
    Subcategory,
    SubcategoryCreate,
    SubcategoryRead,
    SubcategoryUpdate,
)
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.subcategories import SubcategoryRepository


class CatalogError(Exception):
    """Base class for domain-level catalog errors."""


class NotFoundError(CatalogError):
    """A requested catalog document does not exist."""


class ConflictError(CatalogError):
    """A uniqueness or integrity constraint was violated."""


class InvalidReferenceError(CatalogError):
    """An input references a document that does not exist."""


def _read_category(category: Category) -> CategoryRead:
    return CategoryRead.model_validate(category)


def _read_subcategory(subcategory: Subcategory) -> SubcategoryRead:
    return SubcategoryRead.model_validate(subcategory)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------


async def list_categories(database: AsyncDatabase) -> list[CategoryRead]:
    repository = CategoryRepository(database)
    return [_read_category(category) for category in await repository.list_with_query({})]


async def list_public_categories(database: AsyncDatabase) -> list[CategoryRead]:
    return [
        _read_category(category) for category in await CategoryRepository(database).list_active()
    ]


async def get_category(database: AsyncDatabase, category_id: ObjectId) -> CategoryRead:
    category = await CategoryRepository(database).get_by_id(category_id)
    if category is None:
        raise NotFoundError("Category not found")
    return _read_category(category)


async def get_public_category(database: AsyncDatabase, slug: str) -> CategoryRead:
    category = await CategoryRepository(database).get_by_slug(slug)
    if category is None or not category.is_active:
        raise NotFoundError("Category not found")
    return _read_category(category)


async def create_category(database: AsyncDatabase, payload: CategoryCreate) -> CategoryRead:
    repository = CategoryRepository(database)
    base_slug = payload.slug or slugify(payload.name)
    if not base_slug:
        raise InvalidReferenceError("Could not generate a slug; provide one explicitly")

    if payload.slug is not None:
        if await repository.is_slug_taken(payload.slug):
            raise ConflictError(f"Slug '{payload.slug}' is already in use")
    slug = base_slug
    if payload.slug is None:
        slug = await find_available_slug(base_slug, is_taken=repository.is_slug_taken)

    category = await repository.create(
        Category(
            name=payload.name,
            slug=slug,
            description=payload.description,
            image_url=payload.image_url,
            sort_order=payload.sort_order,
            is_active=payload.is_active,
        )
    )
    return _read_category(category)


async def update_category(
    database: AsyncDatabase, category_id: ObjectId, payload: CategoryUpdate
) -> CategoryRead:
    repository = CategoryRepository(database)
    existing = await repository.get_by_id(category_id)
    if existing is None:
        raise NotFoundError("Category not found")

    changes = payload.model_dump(exclude_unset=True)

    # Slug changes never happen implicitly from a renames; slugs stay stable
    # unless the admin explicitly provides one.
    if payload.slug is not None:
        if changes.get("slug") and await repository.is_slug_taken(
            changes["slug"], exclude_id=existing.id
        ):
            raise ConflictError(f"Slug '{changes['slug']}' is already in use")

    try:
        await repository.update(existing.id, changes)
    except DuplicateKeyError as exc:
        raise ConflictError("A category with that slug already exists") from exc
    return _read_category(await repository.get_by_id(existing.id))  # type: ignore[arg-type]


async def delete_category(database: AsyncDatabase, category_id: ObjectId) -> None:
    repository = CategoryRepository(database)
    existing = await repository.get_by_id(category_id)
    if existing is None:
        raise NotFoundError("Category not found")

    subcategory_count = await SubcategoryRepository(database).count_by_category(existing.id)
    if subcategory_count > 0:
        raise ConflictError(
            f"Category has {subcategory_count} subcategor"
            f"{'y' if subcategory_count == 1 else 'ies'}; delete them first"
        )

    await repository.delete(existing.id)


# ---------------------------------------------------------------------------
# Subcategories
# ---------------------------------------------------------------------------


async def list_subcategories(database: AsyncDatabase) -> list[SubcategoryRead]:
    repository = SubcategoryRepository(database)
    documents = (
        await repository.collection.find({})
        .sort([("category_id", 1), ("sort_order", 1), ("created_at", 1)])
        .to_list(length=None)
    )
    return [_read_subcategory(Subcategory.model_validate(doc)) for doc in documents]


async def get_subcategory(database: AsyncDatabase, subcategory_id: ObjectId) -> SubcategoryRead:
    subcategory = await SubcategoryRepository(database).get_by_id(subcategory_id)
    if subcategory is None:
        raise NotFoundError("Subcategory not found")
    return _read_subcategory(subcategory)


async def list_public_subcategories(
    database: AsyncDatabase, category_slug: str
) -> list[SubcategoryRead]:
    category = await CategoryRepository(database).get_by_slug(category_slug)
    if category is None or not category.is_active:
        raise NotFoundError("Category not found")
    subcategories = await SubcategoryRepository(database).list_by_category(
        category.id, active_only=True
    )
    return [_read_subcategory(subcategory) for subcategory in subcategories]


async def create_subcategory(
    database: AsyncDatabase, payload: SubcategoryCreate
) -> SubcategoryRead:
    category_repository = CategoryRepository(database)
    subcategory_repository = SubcategoryRepository(database)

    category = await category_repository.get_by_id(payload.category_id)
    if category is None:
        raise InvalidReferenceError("Category does not exist")

    base_slug = payload.slug or slugify(payload.name)
    if not base_slug:
        raise InvalidReferenceError("Could not generate a slug; provide one explicitly")

    if payload.slug is not None:
        if await subcategory_repository.is_slug_taken(payload.category_id, payload.slug):
            raise ConflictError(f"Slug '{payload.slug}' already exists in this category")
        slug = payload.slug
    else:
        slug = await find_available_slug(
            base_slug,
            is_taken=lambda candidate: subcategory_repository.is_slug_taken(
                payload.category_id, candidate
            ),
        )

    subcategory = await subcategory_repository.create(
        Subcategory(
            category_id=payload.category_id,
            name=payload.name,
            slug=slug,
            image_url=payload.image_url,
            sort_order=payload.sort_order,
            is_active=payload.is_active,
        )
    )
    return _read_subcategory(subcategory)


async def update_subcategory(
    database: AsyncDatabase, subcategory_id: ObjectId, payload: SubcategoryUpdate
) -> SubcategoryRead:
    repository = SubcategoryRepository(database)
    existing = await repository.get_by_id(subcategory_id)
    if existing is None:
        raise NotFoundError("Subcategory not found")

    changes = payload.model_dump(exclude_unset=True)

    target_category_id = changes.get("category_id", existing.category_id)
    if payload.category_id is not None:
        category = await CategoryRepository(database).get_by_id(target_category_id)
        if category is None:
            raise InvalidReferenceError("Category does not exist")

    if payload.slug is not None:
        if await repository.is_slug_taken(target_category_id, payload.slug, exclude_id=existing.id):
            raise ConflictError(f"Slug '{payload.slug}' already exists in this category")

    try:
        await repository.update(existing.id, changes)
    except DuplicateKeyError as exc:
        raise ConflictError("A subcategory with that slug exists in this category") from exc
    return _read_subcategory(await repository.get_by_id(existing.id))  # type: ignore[arg-type]


async def delete_subcategory(database: AsyncDatabase, subcategory_id: ObjectId) -> None:
    repository = SubcategoryRepository(database)
    existing = await repository.get_by_id(subcategory_id)
    if existing is None:
        raise NotFoundError("Subcategory not found")

    product_count = await ProductRepository(database).count_by_subcategory(existing.id)
    if product_count > 0:
        raise ConflictError(
            f"Subcategory is referenced by {product_count} product(s); "
            "remove or reassign them first"
        )

    await repository.delete(existing.id)


__all__ = [
    "CatalogError",
    "ConflictError",
    "InvalidReferenceError",
    "NotFoundError",
    "create_category",
    "create_subcategory",
    "delete_category",
    "delete_subcategory",
    "get_category",
    "get_public_category",
    "get_subcategory",
    "list_categories",
    "list_public_categories",
    "list_public_subcategories",
    "list_subcategories",
    "update_category",
    "update_subcategory",
]
