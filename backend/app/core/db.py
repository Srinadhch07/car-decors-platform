"""MongoDB connection lifecycle management.

Uses the official PyMongo async client. Connection failures are logged rather
than raised so the API can still serve liveness checks when the database is
unavailable; readiness reporting reflects the real database state.
"""

import logging

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class MongoConnection:
    """Owns a single shared async MongoDB client for the application."""

    def __init__(self) -> None:
        self._client: AsyncMongoClient | None = None
        self._database: AsyncDatabase | None = None

    @property
    def database(self) -> AsyncDatabase:
        """Return the active database handle."""
        if self._database is None:
            raise RuntimeError("MongoDB is not connected. Call connect() first.")
        return self._database

    @property
    def is_connected(self) -> bool:
        return self._client is not None

    async def connect(self, uri: str, db_name: str, timeout_ms: int) -> bool:
        """Create the client and verify connectivity with a ping.

        A failed initial ping is logged and does not abort startup so the
        process can come up before its database dependency is ready. Returns
        ``True`` when the initial ping succeeded.
        """
        self._client = AsyncMongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
        self._database = self._client[db_name]
        try:
            await self._client.admin.command("ping")
            logger.info("Connected to MongoDB database '%s'.", db_name)
            return True
        except PyMongoError as exc:
            logger.warning("MongoDB connection check failed: %s", exc)
            return False

    async def ping(self) -> bool:
        """Return ``True`` if the database responds to a ping."""
        if self._client is None:
            return False
        try:
            await self._client.admin.command("ping")
            return True
        except PyMongoError as exc:
            logger.warning("MongoDB ping failed: %s", exc)
            return False

    async def close(self) -> None:
        """Close the client and release resources."""
        if self._client is not None:
            await self._client.close()
            self._client = None
            self._database = None
            logger.info("MongoDB connection closed.")


mongo = MongoConnection()
