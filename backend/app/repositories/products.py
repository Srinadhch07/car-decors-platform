"""Product data access.

Query documents passed to these methods are constructed by the product service
exclusively from whitelisted, validated inputs (never from raw request JSON).
"""

from typing import Any

from bson import ObjectId

from app.models.product import Product
from app.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):
    collection_name = "products"
    document_model = Product

    async def is_slug_taken(self, slug: str, *, exclude_id: ObjectId | None = None) -> bool:
        query: dict[str, Any] = {"slug": slug}
        if exclude_id is not None:
            query["_id"] = {"$ne": exclude_id}
        return await self.collection.find_one(query, projection={"_id": 1}) is not None

    async def count_query(self, query: dict[str, Any]) -> int:
        return await self.collection.count_documents(query)

    async def fetch_query(self, query: dict[str, Any]) -> list[Product]:
        """Return every matching product without server-side ordering.

        Used when sorting must happen outside MongoDB (price sorting, where the
        values are BSON Decimal128), keeping behavior identical across test,
        local, and production backends.
        """
        documents = await self.collection.find(query).to_list(length=None)
        return [Product.model_validate(doc) for doc in documents]

    async def page_query(
        self,
        query: dict[str, Any],
        *,
        sort_keys: list[tuple[str, int]],
        skip: int,
        limit: int,
    ) -> list[Product]:
        """Return one bounded page with server-side sorting."""
        cursor = self.collection.find(query).sort(sort_keys).skip(skip).limit(limit)
        documents = await cursor.to_list(length=None)
        return [Product.model_validate(doc) for doc in documents]

    async def list_by_category(
        self, category_id: ObjectId, *, active_only: bool = False
    ) -> list[Product]:
        query: dict[str, Any] = {"category_id": category_id}
        if active_only:
            query["is_active"] = True
        documents = await self.collection.find(query).sort("created_at", 1).to_list(length=None)
        return [Product.model_validate(doc) for doc in documents]

    async def list_by_subcategory(
        self, subcategory_id: ObjectId, *, active_only: bool = False
    ) -> list[Product]:
        query: dict[str, Any] = {"subcategory_id": subcategory_id}
        if active_only:
            query["is_active"] = True
        documents = await self.collection.find(query).sort("created_at", 1).to_list(length=None)
        return [Product.model_validate(doc) for doc in documents]

    async def count_by_category(self, category_id: ObjectId) -> int:
        return await self.collection.count_documents({"category_id": category_id})

    async def count_by_subcategory(self, subcategory_id: ObjectId) -> int:
        return await self.collection.count_documents({"subcategory_id": subcategory_id})
