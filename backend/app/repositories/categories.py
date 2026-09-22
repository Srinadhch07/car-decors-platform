"""Category data access."""

from bson import ObjectId

from app.models.category import Category
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[Category]):
    collection_name = "categories"
    document_model = Category

    async def list_active(self) -> list[Category]:
        """Return active categories ordered for display."""
        return await self.list_with_query({"is_active": True})

    async def list_with_query(self, query: dict) -> list[Category]:
        cursor = self.collection.find(query).sort([("sort_order", 1), ("created_at", 1)])
        documents = await cursor.to_list(length=None)
        return [Category.model_validate(doc) for doc in documents]

    async def is_slug_taken(self, slug: str, *, exclude_id: ObjectId | None = None) -> bool:
        """True when a category with this slug exists (optionally excluding one)."""
        query: dict = {"slug": slug}
        if exclude_id is not None:
            query["_id"] = {"$ne": exclude_id}
        return await self.collection.find_one(query, {"_id": 1}) is not None
