"""Subcategory data access."""

from bson import ObjectId

from app.models.subcategory import Subcategory
from app.repositories.base import BaseRepository


class SubcategoryRepository(BaseRepository[Subcategory]):
    collection_name = "subcategories"
    document_model = Subcategory

    async def list_by_category(
        self, category_id: ObjectId, *, active_only: bool = False
    ) -> list[Subcategory]:
        query: dict = {"category_id": category_id}
        if active_only:
            query["is_active"] = True
        cursor = self.collection.find(query).sort([("sort_order", 1), ("created_at", 1)])
        documents = await cursor.to_list(length=None)
        return [Subcategory.model_validate(doc) for doc in documents]

    async def list_with_query(self, query: dict) -> list[Subcategory]:
        cursor = self.collection.find(query).sort(
            [("category_id", 1), ("sort_order", 1), ("created_at", 1)]
        )
        documents = await cursor.to_list(length=None)
        return [Subcategory.model_validate(doc) for doc in documents]

    async def count_by_category(self, category_id: ObjectId) -> int:
        return await self.collection.count_documents({"category_id": category_id})

    async def is_slug_taken(
        self,
        category_id: ObjectId,
        slug: str,
        *,
        exclude_id: ObjectId | None = None,
    ) -> bool:
        """True when the slug exists within the category (optionally excluding one)."""
        query: dict = {"category_id": category_id, "slug": slug}
        if exclude_id is not None:
            query["_id"] = {"$ne": exclude_id}
        return await self.collection.find_one(query, {"_id": 1}) is not None
