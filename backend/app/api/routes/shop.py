"""Shop settings endpoints: public view and admin management."""

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import AdminDep, CsrfDep
from app.db.dependencies import DatabaseDep
from app.models.shop_settings import ShopSettingsPublic, ShopSettingsUpdate
from app.services.shop import get_shop_settings, update_shop_settings

router = APIRouter(tags=["shop"])

_NOT_CONFIGURED = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Shop settings not configured",
)


def _require_settings(settings: ShopSettingsPublic | None) -> ShopSettingsPublic:
    if settings is None:
        raise _NOT_CONFIGURED
    return settings


@router.get("/shop", response_model=ShopSettingsPublic)
async def public_shop(database: DatabaseDep) -> ShopSettingsPublic:
    """Public business information, no authentication required."""
    return _require_settings(await get_shop_settings(database))


@router.get("/admin/shop", response_model=ShopSettingsPublic)
async def admin_get_shop(_admin: AdminDep, database: DatabaseDep) -> ShopSettingsPublic:
    """Return the current shop settings to the authenticated admin."""
    return _require_settings(await get_shop_settings(database))


@router.put("/admin/shop", response_model=ShopSettingsPublic)
async def admin_update_shop(
    payload: ShopSettingsUpdate,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> ShopSettingsPublic:
    """Update the singleton shop settings document."""
    return _require_settings(await update_shop_settings(database, payload))
