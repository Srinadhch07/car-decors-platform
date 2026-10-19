"""Work Gallery business logic: media lifecycle, publishing, and public reads.

The gallery stores one image or video per item. New items are always drafts;
public visibility requires ``is_published`` and featuring additionally requires
an already-published item. Object storage is kept consistent with MongoDB: a
failed write never leaves an orphaned uploaded object, and replacing or
deleting an item removes the previous object only after the database write
succeeds.
"""

import logging
import math
import re
from typing import Any

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.enums import GalleryMediaType
from app.models.gallery import (
    GalleryAdminListPage,
    GalleryAdminRead,
    GalleryCreate,
    GalleryItem,
    GalleryListPage,
    GalleryRead,
    GalleryUpdate,
    derive_gallery_title,
)
from app.repositories.gallery import GalleryRepository
from app.storage.base import Storage, StorageError, is_gallery_key
from app.storage.media import UploadedMedia

logger = logging.getLogger(__name__)

#: Whitelisted sort values mapped to MongoDB sort keys.
SORT_KEYS: dict[str, list[tuple[str, int]]] = {
    "order": [("display_order", 1), ("created_at", -1), ("_id", -1)],
    "newest": [("created_at", -1), ("_id", -1)],
    "oldest": [("created_at", 1), ("_id", 1)],
}

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20
DEFAULT_PUBLIC_PAGE_SIZE = 24
DEFAULT_FEATURED_PAGE_SIZE = 12


class GalleryError(Exception):
    """Base class for Work Gallery domain errors."""


class NotFoundError(GalleryError):
    """A requested gallery item does not exist (or is not publicly visible)."""


class ConflictError(GalleryError):
    """An action conflicts with the visibility rules (e.g. featuring a draft)."""


class InvalidQueryError(GalleryError):
    """A pagination, sort, or filter argument is invalid."""


def _read_public(item: GalleryItem) -> GalleryRead:
    return GalleryRead.model_validate(item)


def _read_admin(item: GalleryItem) -> GalleryAdminRead:
    return GalleryAdminRead.model_validate(item)


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


def _resolve_sort(sort: str) -> list[tuple[str, int]]:
    if sort not in SORT_KEYS:
        raise InvalidQueryError(f"sort must be one of: {', '.join(sorted(SORT_KEYS))}")
    return SORT_KEYS[sort]


def _build_public_page(
    items: list[GalleryItem], total: int, *, page: int, page_size: int
) -> GalleryListPage:
    return GalleryListPage(
        items=[_read_public(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=_total_pages(total, page_size),
    )


def _build_admin_page(
    items: list[GalleryItem], total: int, *, page: int, page_size: int
) -> GalleryAdminListPage:
    return GalleryAdminListPage(
        items=[_read_admin(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=_total_pages(total, page_size),
    )


def _empty_public_page(page: int, page_size: int) -> GalleryListPage:
    _, resolved_page, resolved_size = _validate_pagination(page, page_size)
    return _build_public_page([], 0, page=resolved_page, page_size=resolved_size)


def _search_condition(term: str) -> dict[str, Any]:
    pattern = re.compile(re.escape(term), re.IGNORECASE)
    return {
        "$or": [
            {"title": {"$regex": pattern}},
            {"description": {"$regex": pattern}},
            {"category": {"$regex": pattern}},
        ]
    }


def _public_visibility_query(
    *, media_type: GalleryMediaType | None, category: str | None
) -> dict[str, Any]:
    query: dict[str, Any] = {"is_published": True}
    if media_type is not None:
        query["media_type"] = media_type.value
    if category:
        query["category"] = category
    return query


# ---------------------------------------------------------------------------
# Admin: create / batch
# ---------------------------------------------------------------------------


async def create_gallery_item(
    database: AsyncDatabase,
    storage: Storage,
    payload: GalleryCreate,
    uploaded: UploadedMedia,
) -> GalleryAdminRead:
    """Create a gallery item, uploading its media first.

    If the database write fails the just-uploaded object is removed so failed
    creates never leak files into storage.
    """
    repository = GalleryRepository(database)
    display_order = payload.display_order
    if display_order is None:
        display_order = await repository.next_display_order()

    key = uploaded.key
    await storage.upload(uploaded.key, uploaded.data, uploaded.content_type)
    document = GalleryItem(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        media_type=GalleryMediaType(uploaded.media_type),
        storage_key=key,
        url=storage.public_url(uploaded.key),
        mime_type=uploaded.content_type,
        size_bytes=uploaded.size,
        display_order=display_order,
    )
    try:
        created = await repository.create(document)
    except Exception:
        await _safe_cleanup(storage, uploaded.key)
        raise
    return _read_admin(created)


async def create_gallery_batch(
    database: AsyncDatabase,
    storage: Storage,
    uploads: list[UploadedMedia],
    *,
    category: str | None = None,
    description: str = "",
) -> list[GalleryAdminRead]:
    """Create gallery items from a batch of validated uploads.

    All objects are uploaded first. If any upload fails nothing has been
    persisted and the already-uploaded objects are removed. If a database write
    then fails, every inserted document is rolled back and every uploaded object
    is removed, so a failed batch leaves neither partial records nor orphaned
    files. Per-file validation rejections are handled by the caller before this
    point and reported without aborting the batch.
    """
    repository = GalleryRepository(database)
    uploaded_keys: list[str] = []
    created: list[GalleryItem] = []
    try:
        for upload in uploads:
            await storage.upload(upload.key, upload.data, upload.content_type)
            uploaded_keys.append(upload.key)

        for upload in uploads:
            media_type = GalleryMediaType(upload.media_type)
            document = GalleryItem(
                title=derive_gallery_title(upload.filename, media_type),
                description=description,
                category=category,
                media_type=media_type,
                storage_key=upload.key,
                url=storage.public_url(upload.key),
                mime_type=upload.content_type,
                size_bytes=upload.size,
                display_order=await repository.next_display_order(),
            )
            created.append(await repository.create(document))
    except Exception:
        for item in created:
            if item.id is not None:
                await _safe_delete_record(repository, item.id)
        for key in uploaded_keys:
            await _safe_cleanup(storage, key)
        raise

    return [_read_admin(item) for item in created]


# ---------------------------------------------------------------------------
# Admin: update / mutate
# ---------------------------------------------------------------------------


async def update_gallery_item(
    database: AsyncDatabase,
    storage: Storage,
    item_id: ObjectId,
    payload: GalleryUpdate,
    uploaded: UploadedMedia | None = None,
) -> GalleryAdminRead:
    """Update metadata and optionally replace the stored media.

    Replacement sequence: validate -> upload the new object -> persist in
    MongoDB -> delete the old object. The old object is never removed before the
    new one is stored, and a failed write keeps the previous media intact.
    """
    repository = GalleryRepository(database)
    existing = await repository.get_by_id(item_id)
    if existing is None:
        raise NotFoundError("Gallery item not found")

    changes = payload.model_dump(exclude_unset=True)

    new_key: str | None = None
    old_key: str | None = None
    if uploaded is not None:
        await storage.upload(uploaded.key, uploaded.data, uploaded.content_type)
        new_key = uploaded.key
        old_key = existing.storage_key
        changes.update(
            {
                "storage_key": new_key,
                "url": storage.public_url(new_key),
                "mime_type": uploaded.content_type,
                "media_type": GalleryMediaType(uploaded.media_type).value,
                "size_bytes": uploaded.size,
                "width": None,
                "height": None,
                "duration_seconds": None,
            }
        )

    if changes:
        try:
            await repository.update(existing.id, changes)
        except Exception:
            if new_key is not None:
                await _safe_cleanup(storage, new_key)
            raise

    if new_key is not None and is_gallery_key(old_key):
        await storage.delete(old_key)  # type: ignore[arg-type]

    updated = await repository.get_by_id(existing.id)
    if updated is None:  # pragma: no cover - defensive
        raise NotFoundError("Gallery item not found")
    return _read_admin(updated)


async def set_gallery_publication(
    database: AsyncDatabase, item_id: ObjectId, is_published: bool
) -> GalleryAdminRead:
    """Publish or unpublish an item; unpublishing also clears the featured flag."""
    repository = GalleryRepository(database)
    existing = await repository.get_by_id(item_id)
    if existing is None:
        raise NotFoundError("Gallery item not found")

    changes: dict[str, Any] = {"is_published": is_published}
    if not is_published and existing.is_featured:
        changes["is_featured"] = False
    await repository.update(existing.id, changes)

    updated = await repository.get_by_id(existing.id)
    if updated is None:  # pragma: no cover - defensive
        raise NotFoundError("Gallery item not found")
    return _read_admin(updated)


async def set_gallery_featured(
    database: AsyncDatabase, item_id: ObjectId, is_featured: bool
) -> GalleryAdminRead:
    """Feature or unfeature a gallery item.

    Featuring requires the item to already be published; otherwise the change
    would advertise media that is not publicly visible.
    """
    repository = GalleryRepository(database)
    current = await repository.get_by_id(item_id)
    if current is None:
        raise NotFoundError("Gallery item not found")
    if is_featured and not current.is_published:
        raise ConflictError("Only a published gallery item can be featured")
    await repository.update(item_id, {"is_featured": is_featured})
    updated = await repository.get_by_id(item_id)
    if updated is None:
        raise NotFoundError("Gallery item not found")
    return _read_admin(updated)


async def set_gallery_order(
    database: AsyncDatabase, item_id: ObjectId, display_order: int
) -> GalleryAdminRead:
    """Set an item's display order for curated public ordering."""
    repository = GalleryRepository(database)
    current = await repository.get_by_id(item_id)
    if current is None:
        raise NotFoundError("Gallery item not found")
    await repository.update(item_id, {"display_order": display_order})
    updated = await repository.get_by_id(item_id)
    if updated is None:
        raise NotFoundError("Gallery item not found")
    return _read_admin(updated)


async def delete_gallery_item(
    database: AsyncDatabase, storage: Storage, item_id: ObjectId
) -> None:
    """Delete a gallery item and its stored object.

    The record is removed first; if object cleanup then fails a storage error is
    surfaced so the API never reports a fully successful deletion that was not.
    """
    repository = GalleryRepository(database)
    existing = await repository.get_by_id(item_id)
    if existing is None:
        raise NotFoundError("Gallery item not found")

    await repository.delete(existing.id)

    if is_gallery_key(existing.storage_key):
        await storage.delete(existing.storage_key)
    else:  # pragma: no cover - defensive; stored keys are always gallery keys
        logger.info("Skipping storage cleanup for non-gallery key %r", existing.storage_key)


# ---------------------------------------------------------------------------
# Admin / public: read + listing
# ---------------------------------------------------------------------------


async def get_admin_gallery_item(
    database: AsyncDatabase, item_id: ObjectId
) -> GalleryAdminRead:
    item = await GalleryRepository(database).get_by_id(item_id)
    if item is None:
        raise NotFoundError("Gallery item not found")
    return _read_admin(item)


async def get_public_gallery_item(
    database: AsyncDatabase, item_id: ObjectId
) -> GalleryRead:
    """Public detail: only published items are reachable."""
    item = await GalleryRepository(database).get_by_id(item_id)
    if item is None or not item.is_published:
        raise NotFoundError("Gallery item not found")
    return _read_public(item)


async def list_admin_gallery_items(
    database: AsyncDatabase,
    *,
    search: str | None = None,
    media_type: GalleryMediaType | None = None,
    category: str | None = None,
    is_published: bool | None = None,
    is_featured: bool | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> GalleryAdminListPage:
    """Full gallery view for the admin, including drafts and visibility flags."""
    _resolve_sort(sort)
    query: dict[str, Any] = {}
    conditions: list[dict[str, Any]] = []
    if media_type is not None:
        query["media_type"] = media_type.value
    if category:
        query["category"] = category
    if is_published is not None:
        query["is_published"] = is_published
    if is_featured is not None:
        query["is_featured"] = is_featured
    if search:
        conditions.append(_search_condition(search))
    if conditions:
        query["$and"] = conditions

    skip, resolved_page, resolved_size = _validate_pagination(page, page_size)
    repository = GalleryRepository(database)
    total = await repository.count_query(query)
    items = await repository.page_query(
        query, sort_keys=_resolve_sort(sort), skip=skip, limit=resolved_size
    )
    return _build_admin_page(items, total, page=resolved_page, page_size=resolved_size)


async def list_public_gallery_items(
    database: AsyncDatabase,
    *,
    media_type: GalleryMediaType | None = None,
    category: str | None = None,
    sort: str = "order",
    page: int = 1,
    page_size: int = DEFAULT_PUBLIC_PAGE_SIZE,
) -> GalleryListPage:
    """Public gallery: published items only, in curated display order."""
    _resolve_sort(sort)
    query = _public_visibility_query(media_type=media_type, category=category)
    skip, resolved_page, resolved_size = _validate_pagination(page, page_size)
    repository = GalleryRepository(database)
    total = await repository.count_query(query)
    items = await repository.page_query(
        query, sort_keys=_resolve_sort(sort), skip=skip, limit=resolved_size
    )
    return _build_public_page(items, total, page=resolved_page, page_size=resolved_size)


async def list_featured_gallery_items(
    database: AsyncDatabase,
    *,
    page: int = 1,
    page_size: int = DEFAULT_FEATURED_PAGE_SIZE,
) -> GalleryListPage:
    """Published, featured items for marketing surfaces (homepage, etc.)."""
    query: dict[str, Any] = {"is_published": True, "is_featured": True}
    skip, resolved_page, resolved_size = _validate_pagination(page, page_size)
    repository = GalleryRepository(database)
    total = await repository.count_query(query)
    items = await repository.page_query(
        query, sort_keys=SORT_KEYS["order"], skip=skip, limit=resolved_size
    )
    return _build_public_page(items, total, page=resolved_page, page_size=resolved_size)


async def _safe_cleanup(storage: Storage, key: str) -> None:
    try:
        await storage.delete(key)
    except StorageError as exc:  # pragma: no cover - best-effort orphan cleanup
        logger.warning("Failed to clean up uploaded gallery object %s: %s", key, exc)


async def _safe_delete_record(repository: GalleryRepository, item_id: ObjectId) -> None:
    try:
        await repository.delete(item_id)
    except Exception as exc:  # pragma: no cover - best-effort rollback
        logger.warning("Failed to roll back gallery item %s: %s", item_id, exc)


__all__ = [
    "ConflictError",
    "GalleryError",
    "InvalidQueryError",
    "NotFoundError",
    "SORT_KEYS",
    "create_gallery_item",
    "delete_gallery_item",
    "get_admin_gallery_item",
    "get_public_gallery_item",
    "list_admin_gallery_items",
    "list_featured_gallery_items",
    "list_public_gallery_items",
    "set_gallery_featured",
    "set_gallery_order",
    "set_gallery_publication",
    "update_gallery_item",
]
