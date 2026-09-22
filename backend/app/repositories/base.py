"""Generic repository base for MongoDB collections."""

from typing import Any, ClassVar, Generic, TypeVar

from bson import ObjectId
from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase

from app.models.base import BaseDocument, utc_now

TDocument = TypeVar("TDocument", bound=BaseDocument)


class BaseRepository(Generic[TDocument]):
    """Common CRUD helpers shared by concrete repositories.

    A repository is constructed with an explicit database handle, which keeps
    data access injectable and free of hidden global state.
    """

    collection_name: ClassVar[str]
    document_model: ClassVar[type[BaseDocument]]

    def __init__(self, database: AsyncDatabase) -> None:
        self._database = database

    @property
    def collection(self) -> AsyncCollection:
        return self._database[self.collection_name]

    def _to_document(self, model: BaseDocument) -> dict[str, Any]:
        return model.model_dump(by_alias=True, exclude_none=True, mode="python")

    def _to_model(self, document: dict[str, Any] | None) -> TDocument | None:
        if document is None:
            return None
        return self.document_model.model_validate(document)  # type: ignore[return-value]

    async def create(self, model: TDocument) -> TDocument:
        """Insert a document and return the model with its generated id."""
        result = await self.collection.insert_one(self._to_document(model))
        return model.model_copy(update={"id": result.inserted_id})

    async def get_by_id(self, object_id: ObjectId) -> TDocument | None:
        return self._to_model(await self.collection.find_one({"_id": object_id}))

    async def get_by_slug(self, slug: str) -> TDocument | None:
        return self._to_model(await self.collection.find_one({"slug": slug}))

    async def list(self, *, limit: int | None = None, skip: int = 0) -> list[TDocument]:
        cursor = self.collection.find({}).sort("created_at", 1).skip(skip)
        if limit is not None:
            cursor = cursor.limit(limit)
        documents = await cursor.to_list(length=None)
        return [self.document_model.model_validate(doc) for doc in documents]  # type: ignore[misc]

    async def update(self, object_id: ObjectId, changes: dict[str, Any]) -> bool:
        """Apply a partial update and refresh ``updated_at``."""
        if not changes:
            return False
        payload = {**changes, "updated_at": utc_now()}
        result = await self.collection.update_one({"_id": object_id}, {"$set": payload})
        return result.modified_count > 0

    async def delete(self, object_id: ObjectId) -> bool:
        result = await self.collection.delete_one({"_id": object_id})
        return result.deleted_count > 0

    async def count(self) -> int:
        return await self.collection.count_documents({})
