"""Catalog endpoints: public reads and admin category/subcategory management."""

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import AdminDep, CsrfDep
from app.db.dependencies import DatabaseDep
from app.models.base import PyObjectId
from app.models.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.models.subcategory import SubcategoryCreate, SubcategoryRead, SubcategoryUpdate
from app.services.catalog import (
    CatalogError,
    ConflictError,
    InvalidReferenceError,
    NotFoundError,
    create_category,
    create_subcategory,
    delete_category,
    delete_subcategory,
    get_category,
    get_public_category,
    get_subcategory,
    list_categories,
    list_public_categories,
    list_public_subcategories,
    list_subcategories,
    update_category,
    update_subcategory,
)

admin_router = APIRouter(tags=["admin-catalog"])
public_router = APIRouter(tags=["catalog"])


def _map_catalog_errors(exc: CatalogError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, (ConflictError, InvalidReferenceError)):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------


@public_router.get("/categories", response_model=list[CategoryRead])
async def public_categories(database: DatabaseDep) -> list[CategoryRead]:
    """Active categories only."""
    return await list_public_categories(database)


@public_router.get("/categories/{slug}", response_model=CategoryRead)
async def public_category(slug: str, database: DatabaseDep) -> CategoryRead:
    """A single active category by slug."""
    try:
        return await get_public_category(database, slug)
    except NotFoundError as exc:
        raise _map_catalog_errors(exc) from exc


@public_router.get("/categories/{slug}/subcategories", response_model=list[SubcategoryRead])
async def public_subcategories(slug: str, database: DatabaseDep) -> list[SubcategoryRead]:
    """Active subcategories of an active category, by category slug."""
    try:
        return await list_public_subcategories(database, slug)
    except NotFoundError as exc:
        raise _map_catalog_errors(exc) from exc


# ---------------------------------------------------------------------------
# Admin: categories
# ---------------------------------------------------------------------------


@admin_router.get("/admin/categories", response_model=list[CategoryRead])
async def admin_list_categories(_admin: AdminDep, database: DatabaseDep) -> list[CategoryRead]:
    """All categories including inactive ones."""
    return await list_categories(database)


@admin_router.post(
    "/admin/categories",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_category(
    payload: CategoryCreate,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> CategoryRead:
    try:
        return await create_category(database, payload)
    except CatalogError as exc:
        raise _map_catalog_errors(exc) from exc


@admin_router.get("/admin/categories/{category_id}", response_model=CategoryRead)
async def admin_get_category(
    category_id: PyObjectId,
    _admin: AdminDep,
    database: DatabaseDep,
) -> CategoryRead:
    try:
        return await get_category(database, category_id)
    except NotFoundError as exc:
        raise _map_catalog_errors(exc) from exc


@admin_router.put("/admin/categories/{category_id}", response_model=CategoryRead)
async def admin_update_category(
    category_id: PyObjectId,
    payload: CategoryUpdate,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> CategoryRead:
    try:
        return await update_category(database, category_id, payload)
    except CatalogError as exc:
        raise _map_catalog_errors(exc) from exc


@admin_router.delete("/admin/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_category(
    category_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> None:
    try:
        await delete_category(database, category_id)
    except CatalogError as exc:
        raise _map_catalog_errors(exc) from exc


# ---------------------------------------------------------------------------
# Admin: subcategories
# ---------------------------------------------------------------------------


@admin_router.get("/admin/subcategories", response_model=list[SubcategoryRead])
async def admin_list_subcategories(
    _admin: AdminDep, database: DatabaseDep
) -> list[SubcategoryRead]:
    """All subcategories including inactive ones."""
    return await list_subcategories(database)


@admin_router.post(
    "/admin/subcategories",
    response_model=SubcategoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_subcategory(
    payload: SubcategoryCreate,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> SubcategoryRead:
    try:
        return await create_subcategory(database, payload)
    except CatalogError as exc:
        raise _map_catalog_errors(exc) from exc


@admin_router.get("/admin/subcategories/{subcategory_id}", response_model=SubcategoryRead)
async def admin_get_subcategory(
    subcategory_id: PyObjectId,
    _admin: AdminDep,
    database: DatabaseDep,
) -> SubcategoryRead:
    try:
        return await get_subcategory(database, subcategory_id)
    except NotFoundError as exc:
        raise _map_catalog_errors(exc) from exc


@admin_router.put("/admin/subcategories/{subcategory_id}", response_model=SubcategoryRead)
async def admin_update_subcategory(
    subcategory_id: PyObjectId,
    payload: SubcategoryUpdate,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> SubcategoryRead:
    try:
        return await update_subcategory(database, subcategory_id, payload)
    except CatalogError as exc:
        raise _map_catalog_errors(exc) from exc


@admin_router.delete(
    "/admin/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def admin_delete_subcategory(
    subcategory_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> None:
    try:
        await delete_subcategory(database, subcategory_id)
    except CatalogError as exc:
        raise _map_catalog_errors(exc) from exc
