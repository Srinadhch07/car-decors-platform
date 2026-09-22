"""Shop settings data access (singleton document)."""

from typing import Any

from bson import ObjectId

from app.models.base import utc_now
from app.models.shop_settings import ShopSettings
from app.repositories.base import BaseRepository

#: Fixed id guaranteeing a single shop settings document.
SHOP_SETTINGS_ID = ObjectId("000000000000000000000001")


class ShopSettingsRepository(BaseRepository[ShopSettings]):
    collection_name = "shop_settings"
    document_model = ShopSettings

    async def get(self) -> ShopSettings | None:
        return self._to_model(await self.collection.find_one({"_id": SHOP_SETTINGS_ID}))

    async def create_if_absent(self, settings: ShopSettings) -> bool:
        """Create the singleton only if it does not exist.

        Returns ``True`` when the document was created, ``False`` when it was
        already present (existing values are never overwritten).
        """
        document = self._to_document(settings)
        document.pop("_id", None)
        result = await self.collection.update_one(
            {"_id": SHOP_SETTINGS_ID},
            {"$setOnInsert": document},
            upsert=True,
        )
        return result.upserted_id is not None

    async def update_fields(self, changes: dict[str, Any]) -> bool:
        """Apply a partial update to the singleton, refreshing ``updated_at``.

        Always targets the fixed id and upserts, so the collection can never
        contain a second shop settings document - even when the admin updates
        settings on a database that has not been seeded yet.
        """
        if not changes:
            return False
        now = utc_now()
        result = await self.collection.update_one(
            {"_id": SHOP_SETTINGS_ID},
            {
                "$set": {**changes, "updated_at": now},
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
        )
        return result.matched_count > 0 or result.upserted_id is not None
