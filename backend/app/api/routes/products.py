"""Product endpoints: public discovery and admin CRUD with image uploads.

Admin mutations require both admin authentication and a valid CSRF token.
Product creation/update use multipart/form-data so the (optional) image rides
in the same request as the structured fields.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import ValidationError
from pymongo.errors import PyMongoError

from app.api.dependencies import AdminDep, CsrfDep
from app.core.config import get_settings
from app.db.dependencies import DatabaseDep
from app.models.base import PyObjectId
from app.models.enums import Availability
from app.models.product import (
    AdminProductListPage,
    AdminProductRead,
    ProductListPage,
    ProductRead,
    StockAdjustRequest,
    build_product_create,
    build_product_update,
)
from app.services.products import (
    ConflictError,
    InvalidQueryError,
    InvalidReferenceError,
    NotFoundError,
    ProductError,
    adjust_product_stock,
    create_product,
    delete_product,
    get_admin_product,
    get_public_product,
    list_admin_products,
    list_public_products,
    update_product,
)
from app.storage.base import (
    ImageValidationError,
    StorageError,
    TooLargeImageError,
    UnsupportedImageError,
)
from app.storage.dependencies import StorageDep
from app.storage.images import validate_image_upload

logger = logging.getLogger(__name__)

admin_router = APIRouter(tags=["admin-products"])
public_router = APIRouter(tags=["products"])


def _map_product_error(exc: ProductError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, (ConflictError, InvalidReferenceError)):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, InvalidQueryError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _map_image_error(exc: ImageValidationError) -> HTTPException:
    if isinstance(exc, TooLargeImageError):
        return HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(exc))
    if isinstance(exc, UnsupportedImageError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _map_storage_error(exc: StorageError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Image storage failure: {exc}",
    )


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


async def _validate_optional_image(image: UploadFile | None):
    if image is None:
        return None
    try:
        return await validate_image_upload(get_settings(), image)
    except ImageValidationError as exc:
        raise _map_image_error(exc) from exc


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------


@public_router.get("/products", response_model=ProductListPage)
async def public_products(
    database: DatabaseDep,
    search: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    vehicle: str | None = None,
    availability: Availability | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
) -> ProductListPage:
    """Public catalog with search, filters, pagination, and sorting."""
    try:
        return await list_public_products(
            database,
            search=search,
            category_slug=category,
            subcategory_slug=subcategory,
            vehicle=vehicle,
            availability=availability,
            sort=sort,
            page=page,
            page_size=page_size,
        )
    except InvalidQueryError as exc:
        raise _map_product_error(exc) from exc


@public_router.get("/products/{slug}", response_model=ProductRead)
async def public_product(slug: str, database: DatabaseDep) -> ProductRead:
    """Public product detail honoring the full visibility chain."""
    try:
        return await get_public_product(database, slug)
    except NotFoundError as exc:
        raise _map_product_error(exc) from exc


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


@admin_router.get("/admin/products", response_model=AdminProductListPage)
async def admin_list_products(
    _admin: AdminDep,
    database: DatabaseDep,
    search: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    availability: Availability | None = None,
    is_active: bool | None = None,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
) -> AdminProductListPage:
    """Admin product view; inactive products and inactive chains included."""
    try:
        return await list_admin_products(
            database,
            search=search,
            category_slug=category,
            subcategory_slug=subcategory,
            availability=availability,
            is_active=is_active,
            sort=sort,
            page=page,
            page_size=page_size,
        )
    except InvalidQueryError as exc:
        raise _map_product_error(exc) from exc


@admin_router.get("/admin/products/{product_id}", response_model=AdminProductRead)
async def admin_get_product(
    product_id: PyObjectId, _admin: AdminDep, database: DatabaseDep
) -> AdminProductRead:
    try:
        return await get_admin_product(database, product_id)
    except NotFoundError as exc:
        raise _map_product_error(exc) from exc


@admin_router.post(
    "/admin/products",
    response_model=AdminProductRead,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_product(
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    storage: StorageDep,
    name: Annotated[str, Form()],
    category_id: Annotated[str, Form()],
    subcategory_id: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    price: Annotated[str | None, Form()] = None,
    availability: Annotated[str | None, Form()] = None,
    stock_quantity: Annotated[str | None, Form()] = None,
    external_url: Annotated[str | None, Form()] = None,
    is_active: Annotated[str | None, Form()] = None,
    vehicle_tags: Annotated[str | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
) -> AdminProductRead:
    """Create a product; ``image`` is optional (single JPEG/PNG/WEBP, <=5 MB)."""
    try:
        payload = build_product_create(
            {
                "name": name,
                "category_id": category_id,
                "subcategory_id": subcategory_id,
                "description": description,
                "price": price,
                "availability": availability,
                "stock_quantity": stock_quantity,
                "external_url": external_url,
                "is_active": is_active,
                "vehicle_tags": vehicle_tags,
            }
        )
    except ValueError as exc:
        raise _bad_request(str(exc)) from exc
    except ValidationError as exc:
        raise _bad_request(str(exc)) from exc

    uploaded = await _validate_optional_image(image)
    try:
        return await create_product(database, storage, payload, uploaded_image=uploaded)
    except ProductError as exc:
        raise _map_product_error(exc) from exc
    except StorageError as exc:
        raise _map_storage_error(exc) from exc


@admin_router.put("/admin/products/{product_id}", response_model=AdminProductRead)
async def admin_update_product(
    product_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    storage: StorageDep,
    name: Annotated[str | None, Form()] = None,
    category_id: Annotated[str | None, Form()] = None,
    subcategory_id: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    price: Annotated[str | None, Form()] = None,
    availability: Annotated[str | None, Form()] = None,
    stock_quantity: Annotated[str | None, Form()] = None,
    external_url: Annotated[str | None, Form()] = None,
    is_active: Annotated[str | None, Form()] = None,
    vehicle_tags: Annotated[str | None, Form()] = None,
    clear_fields: Annotated[str | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
) -> AdminProductRead:
    """Update a product. ``image`` replaces and deletes the previous one."""
    try:
        payload = build_product_update(
            {
                "name": name,
                "category_id": category_id,
                "subcategory_id": subcategory_id,
                "description": description,
                "price": price,
                "availability": availability,
                "stock_quantity": stock_quantity,
                "external_url": external_url,
                "is_active": is_active,
                "vehicle_tags": vehicle_tags,
                "clear_fields": clear_fields,
            }
        )
    except ValueError as exc:
        raise _bad_request(str(exc)) from exc
    except ValidationError as exc:
        raise _bad_request(str(exc)) from exc

    uploaded = await _validate_optional_image(image)
    try:
        return await update_product(database, storage, product_id, payload, uploaded_image=uploaded)
    except ProductError as exc:
        raise _map_product_error(exc) from exc
    except StorageError as exc:
        raise _map_storage_error(exc) from exc


@admin_router.patch("/admin/products/{product_id}/stock", response_model=AdminProductRead)
async def admin_adjust_stock(
    product_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    request: StockAdjustRequest,
) -> AdminProductRead:
    """Adjust stock by exactly one unit using a concurrency-safe write."""
    try:
        return await adjust_product_stock(database, product_id, request.delta)
    except ProductError as exc:
        raise _map_product_error(exc) from exc
    except PyMongoError as exc:
        logger.error("Stock adjustment failed for product %s: %s", product_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stock update failed; please try again",
        ) from exc


@admin_router.delete("/admin/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_product(
    product_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
    storage: StorageDep,
) -> None:
    """Delete a product and its stored image from storage."""
    try:
        await delete_product(database, storage, product_id)
    except ProductError as exc:
        raise _map_product_error(exc) from exc
    except StorageError as exc:
        raise _map_storage_error(exc) from exc
