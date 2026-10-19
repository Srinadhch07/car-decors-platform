"""Work Gallery endpoints: public discovery and admin CRUD with uploads.

Admin mutations require both admin authentication and a valid CSRF token.
Create/update/batch use multipart/form-data so uploaded media rides in the same
request as the structured metadata.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError

from app.api.dependencies import AdminDep, CsrfDep
from app.core.config import get_settings
from app.db.dependencies import DatabaseDep
from app.models.base import PyObjectId
from app.models.enums import GalleryMediaType
from app.models.gallery import (
    GalleryAdminListPage,
    GalleryAdminRead,
    GalleryBatchFailure,
    GalleryBatchResult,
    GalleryCreate,
    GalleryFeaturedRequest,
    GalleryListPage,
    GalleryOrderRequest,
    GalleryPublicationRequest,
    GalleryRead,
    build_gallery_create,
    build_gallery_update,
    derive_gallery_title,
)
from app.services import gallery as gallery_service
from app.services.gallery import (
    ConflictError,
    GalleryError,
    InvalidQueryError,
    NotFoundError,
)
from app.storage.base import (
    MediaValidationError,
    StorageError,
    TooLargeMediaError,
    UnsupportedMediaError,
)
from app.storage.dependencies import StorageDep
from app.storage.media import UploadedMedia, validate_media_upload

logger = logging.getLogger(__name__)

public_router = APIRouter(tags=["gallery"])
admin_router = APIRouter(tags=["admin-gallery"])


def _map_gallery_error(exc: GalleryError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, ConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, InvalidQueryError):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        )
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _map_media_error(exc: MediaValidationError) -> HTTPException:
    if isinstance(exc, TooLargeMediaError):
        return HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc))
    if isinstance(exc, UnsupportedMediaError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _map_storage_error(exc: StorageError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Media storage failure: {exc}",
    )


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=detail)


async def _validate_media(upload: UploadFile | None) -> UploadedMedia | None:
    if upload is None:
        return None
    try:
        return await validate_media_upload(get_settings(), upload)
    except MediaValidationError as exc:
        raise _map_media_error(exc) from exc


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------


@public_router.get("/gallery", response_model=GalleryListPage)
async def public_gallery_items(
    database: DatabaseDep,
    media_type: GalleryMediaType | None = None,
    category: str | None = None,
    sort: str = "order",
    page: int = 1,
    page_size: int = 24,
) -> GalleryListPage:
    """Public gallery: published items only, with media-type/category filters."""
    try:
        return await gallery_service.list_public_gallery_items(
            database,
            media_type=media_type,
            category=category,
            sort=sort,
            page=page,
            page_size=page_size,
        )
    except InvalidQueryError as exc:
        raise _map_gallery_error(exc) from exc


@public_router.get("/gallery/featured", response_model=GalleryListPage)
async def public_featured_gallery_items(
    database: DatabaseDep,
    page: int = 1,
    page_size: int = 12,
) -> GalleryListPage:
    """Featured gallery items for marketing surfaces (homepage, etc.)."""
    try:
        return await gallery_service.list_featured_gallery_items(
            database, page=page, page_size=page_size
        )
    except InvalidQueryError as exc:
        raise _map_gallery_error(exc) from exc


@public_router.get("/gallery/{item_id}", response_model=GalleryRead)
async def public_gallery_item(item_id: PyObjectId, database: DatabaseDep) -> GalleryRead:
    """Public detail; unpublished items are not reachable."""
    try:
        return await gallery_service.get_public_gallery_item(database, item_id)
    except NotFoundError as exc:
        raise _map_gallery_error(exc) from exc


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


@admin_router.get("/admin/gallery", response_model=GalleryAdminListPage)
async def admin_list_gallery_items(
    _admin: AdminDep,
    database: DatabaseDep,
    search: str | None = None,
    media_type: GalleryMediaType | None = None,
    category: str | None = None,
    is_published: bool | None = None,
    is_featured: bool | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
) -> GalleryAdminListPage:
    """Admin gallery view; drafts and visibility flags included."""
    try:
        return await gallery_service.list_admin_gallery_items(
            database,
            search=search,
            media_type=media_type,
            category=category,
            is_published=is_published,
            is_featured=is_featured,
            sort=sort,
            page=page,
            page_size=page_size,
        )
    except InvalidQueryError as exc:
        raise _map_gallery_error(exc) from exc


@admin_router.get("/admin/gallery/{item_id}", response_model=GalleryAdminRead)
async def admin_get_gallery_item(
    item_id: PyObjectId, _admin: AdminDep, database: DatabaseDep
) -> GalleryAdminRead:
    try:
        return await gallery_service.get_admin_gallery_item(database, item_id)
    except NotFoundError as exc:
        raise _map_gallery_error(exc) from exc


@admin_router.post(
    "/admin/gallery",
    response_model=GalleryAdminRead,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_gallery_item(
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    storage: StorageDep,
    file: Annotated[UploadFile, File()],
    title: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    category: Annotated[str | None, Form()] = None,
    display_order: Annotated[str | None, Form()] = None,
) -> GalleryAdminRead:
    """Create a gallery item; ``file`` is one JPEG/PNG/WEBP or MP4 upload."""
    uploaded = await _validate_media(file)
    if uploaded is None:  # pragma: no cover - File() is required
        raise _bad_request("A media file is required")
    resolved_title = (title or "").strip() or derive_gallery_title(
        uploaded.filename, GalleryMediaType(uploaded.media_type)
    )
    try:
        payload = build_gallery_create(
            {
                "title": resolved_title,
                "description": description,
                "category": category,
                "display_order": display_order,
            }
        )
    except ValueError as exc:
        raise _bad_request(str(exc)) from exc
    except ValidationError as exc:
        raise _bad_request(str(exc)) from exc

    try:
        return await gallery_service.create_gallery_item(database, storage, payload, uploaded)
    except GalleryError as exc:
        raise _map_gallery_error(exc) from exc
    except StorageError as exc:
        raise _map_storage_error(exc) from exc


@admin_router.post(
    "/admin/gallery/batch",
    response_model=GalleryBatchResult,
    status_code=status.HTTP_201_CREATED,
)
async def admin_batch_create_gallery_items(
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    storage: StorageDep,
    files: Annotated[list[UploadFile], File()],
    category: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
) -> GalleryBatchResult:
    """Upload up to the configured maximum of media files in one request.

    Valid files are stored together; files that fail validation are reported in
    ``failures`` without aborting the batch.
    """
    settings = get_settings()
    if len(files) > settings.gallery_batch_max_files:
        raise _bad_request(
            f"At most {settings.gallery_batch_max_files} files are allowed per batch"
        )

    try:
        meta = GalleryCreate(
            title="batch",
            description=description or "",
            category=category,
        )
    except ValidationError as exc:
        raise _bad_request(str(exc)) from exc

    uploads: list[UploadedMedia] = []
    failures: list[GalleryBatchFailure] = []
    for upload in files:
        try:
            uploads.append(await validate_media_upload(settings, upload))
        except MediaValidationError as exc:
            failures.append(
                GalleryBatchFailure(filename=upload.filename or "unknown", detail=str(exc))
            )

    items: list[GalleryAdminRead] = []
    if uploads:
        try:
            items = await gallery_service.create_gallery_batch(
                database,
                storage,
                uploads,
                category=meta.category,
                description=meta.description,
            )
        except StorageError as exc:
            raise _map_storage_error(exc) from exc
    return GalleryBatchResult(items=items, failures=failures)


@admin_router.put("/admin/gallery/{item_id}", response_model=GalleryAdminRead)
async def admin_update_gallery_item(
    item_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    storage: StorageDep,
    title: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    category: Annotated[str | None, Form()] = None,
    display_order: Annotated[str | None, Form()] = None,
    clear_fields: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile | None, File()] = None,
) -> GalleryAdminRead:
    """Update metadata; ``file`` optionally replaces and deletes the old media."""
    try:
        payload = build_gallery_update(
            {
                "title": title,
                "description": description,
                "category": category,
                "display_order": display_order,
                "clear_fields": clear_fields,
            }
        )
    except ValueError as exc:
        raise _bad_request(str(exc)) from exc
    except ValidationError as exc:
        raise _bad_request(str(exc)) from exc

    uploaded = await _validate_media(file)
    try:
        return await gallery_service.update_gallery_item(
            database, storage, item_id, payload, uploaded
        )
    except GalleryError as exc:
        raise _map_gallery_error(exc) from exc
    except StorageError as exc:
        raise _map_storage_error(exc) from exc


@admin_router.patch(
    "/admin/gallery/{item_id}/publication", response_model=GalleryAdminRead
)
async def admin_set_gallery_publication(
    item_id: PyObjectId,
    payload: GalleryPublicationRequest,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> GalleryAdminRead:
    """Publish/unpublish an item; unpublishing also clears the featured flag."""
    try:
        return await gallery_service.set_gallery_publication(
            database, item_id, payload.is_published
        )
    except NotFoundError as exc:
        raise _map_gallery_error(exc) from exc


@admin_router.patch("/admin/gallery/{item_id}/feature", response_model=GalleryAdminRead)
async def admin_set_gallery_featured(
    item_id: PyObjectId,
    payload: GalleryFeaturedRequest,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> GalleryAdminRead:
    """Feature/unfeature; featuring requires the item to be published."""
    try:
        return await gallery_service.set_gallery_featured(
            database, item_id, payload.is_featured
        )
    except (NotFoundError, ConflictError) as exc:
        raise _map_gallery_error(exc) from exc


@admin_router.patch("/admin/gallery/{item_id}/order", response_model=GalleryAdminRead)
async def admin_set_gallery_order(
    item_id: PyObjectId,
    payload: GalleryOrderRequest,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> GalleryAdminRead:
    """Set the curated display order of a gallery item."""
    try:
        return await gallery_service.set_gallery_order(database, item_id, payload.display_order)
    except NotFoundError as exc:
        raise _map_gallery_error(exc) from exc


@admin_router.delete(
    "/admin/gallery/{item_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def admin_delete_gallery_item(
    item_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    storage: StorageDep,
) -> None:
    """Delete a gallery item and its stored media object."""
    try:
        await gallery_service.delete_gallery_item(database, storage, item_id)
    except GalleryError as exc:
        raise _map_gallery_error(exc) from exc
    except StorageError as exc:
        raise _map_storage_error(exc) from exc
