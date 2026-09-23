"""Shop settings service layer (singleton read/update boundary)."""

from pymongo.asynchronous.database import AsyncDatabase

from app.models.shop_settings import ShopSettingsPublic, ShopSettingsUpdate
from app.repositories.shop_settings import ShopSettingsRepository


def _to_patch(update: ShopSettingsUpdate) -> dict:
    """Convert a validated update into the exact ``$set`` patch.

    ``exclude_unset`` keeps untouched fields out; explicit ``null`` clears
    optional values. Fields whose document model requires a string default are
    coerced to empty strings so stored documents always validate on read-back.
    """
    patch = update.model_dump(exclude_unset=True)
    for field in ("whatsapp_number", "phone", "address"):
        if patch.get(field) is None:
            patch[field] = ""
    if patch.get("social_links") is None:
        patch["social_links"] = {}
    # There is no meaningful "no theme" state; explicit null keeps the current
    # theme rather than storing a value that would invalidate the document.
    if patch.get("theme") is None:
        patch.pop("theme", None)
    return patch


async def get_shop_settings(database: AsyncDatabase) -> ShopSettingsPublic | None:
    """Return the public view of the singleton, or ``None`` when unseeded."""
    settings = await ShopSettingsRepository(database).get()
    if settings is None:
        return None
    return ShopSettingsPublic.model_validate(settings)


async def update_shop_settings(
    database: AsyncDatabase, update: ShopSettingsUpdate
) -> ShopSettingsPublic | None:
    """Apply an admin update to the singleton and return the refreshed view."""
    patch = _to_patch(update)
    if not patch:
        return await get_shop_settings(database)
    await ShopSettingsRepository(database).update_fields(patch)
    return await get_shop_settings(database)
