"""Thin async adapter over the synchronous mongomock client.

mongomock does not yet provide an async interface (see mongomock#916), so
repository code — which is written against PyMongo's async API — is exercised
against this adapter in tests. It only needs to implement the operations the
data layer actually uses. This module is test-only and intentionally kept small.
"""

from __future__ import annotations

from typing import Any


class AsyncCursor:
    """Wraps a mongomock cursor with PyMongo's async cursor surface."""

    def __init__(self, cursor: Any) -> None:
        self._cursor = cursor

    def sort(self, key_or_list: Any, direction: int | None = None) -> AsyncCursor:
        if direction is not None:
            self._cursor = self._cursor.sort(key_or_list, direction)
        else:
            self._cursor = self._cursor.sort(key_or_list)
        return self

    def skip(self, count: int) -> AsyncCursor:
        self._cursor = self._cursor.skip(count)
        return self

    def limit(self, count: int) -> AsyncCursor:
        self._cursor = self._cursor.limit(count)
        return self

    async def to_list(self, length: int | None = None) -> list[dict[str, Any]]:
        items = list(self._cursor)
        return items if length is None else items[:length]

    def __aiter__(self) -> AsyncCursor:
        return self

    async def __anext__(self) -> dict[str, Any]:
        try:
            return next(self._cursor)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class AsyncCollection:
    """Wraps a mongomock collection with an async call surface."""

    def __init__(self, collection: Any) -> None:
        self._collection = collection

    async def insert_one(self, document: dict[str, Any]) -> Any:
        return self._collection.insert_one(document)

    async def find_one(
        self, filter: dict[str, Any] | None = None, *args: Any, **kwargs: Any
    ) -> dict[str, Any] | None:
        return self._collection.find_one(filter or {}, *args, **kwargs)

    def find(self, filter: dict[str, Any] | None = None, *args: Any, **kwargs: Any) -> AsyncCursor:
        return AsyncCursor(self._collection.find(filter or {}, *args, **kwargs))

    async def update_one(
        self, filter: dict[str, Any], update: dict[str, Any], upsert: bool = False, **kwargs: Any
    ) -> Any:
        return self._collection.update_one(filter, update, upsert=upsert, **kwargs)

    async def update_many(
        self, filter: dict[str, Any], update: dict[str, Any], **kwargs: Any
    ) -> Any:
        return self._collection.update_many(filter, update, **kwargs)

    async def delete_one(self, filter: dict[str, Any]) -> Any:
        return self._collection.delete_one(filter)

    async def delete_many(self, filter: dict[str, Any]) -> Any:
        return self._collection.delete_many(filter)

    async def count_documents(self, filter: dict[str, Any]) -> int:
        return self._collection.count_documents(filter)

    async def create_index(self, keys: Any, **kwargs: Any) -> str:
        return self._collection.create_index(keys, **kwargs)

    def list_indexes(self) -> AsyncCursor:
        return AsyncCursor(self._collection.list_indexes())

    async def distinct(self, key: str, filter: dict[str, Any] | None = None) -> list[Any]:
        return self._collection.distinct(key, filter)

    async def drop(self) -> None:
        return self._collection.drop()


class AsyncDatabase:
    """Wraps a mongomock database with ``__getitem__`` access."""

    def __init__(self, database: Any) -> None:
        self._database = database

    def __getitem__(self, name: str) -> AsyncCollection:
        return AsyncCollection(self._database[name])

    async def list_collection_names(self) -> list[str]:
        return self._database.list_collection_names()

    def command(self, *args: Any, **kwargs: Any) -> Any:
        return self._database.command(*args, **kwargs)
