"""Work Gallery data access.

Query documents passed to these methods are constructed by the gallery service
exclusively from whitelisted, validated inputs (never from raw request JSON).
"""

from typing import Any

from app.models.gallery import GalleryItem
from app.repositories.base import BaseRepository


class GalleryRepository(BaseRepository[GalleryItem]):
    collection_name = "gallery"
    document_model = GalleryItem

    async def count_query(self, query: dict[str, Any]) -> int:
        return await self.collection.count_documents(query)

    async def page_query(
        self,
        query: dict[str, Any],
        *,
        sort_keys: list[tuple[str, int]],
        skip: int,
        limit: int,
    ) -> list[GalleryItem]:
        """Return one bounded page with server-side ordering."""
        cursor = self.collection.find(query).sort(sort_keys).skip(skip).limit(limit)
        documents = await cursor.to_list(length=None)
        return [GalleryItem.model_validate(doc) for doc in documents]

    async def next_display_order(self) -> int:
        """Return the next append position (max existing order + 1)."""
        document = await self.collection.find_one(
            {}, sort=[("display_order", -1)], projection={"display_order": 1}
        )
        if not document:
            return 0
        current = document.get("display_order")
        if not isinstance(current, int):
            return 0
        return current + 1
