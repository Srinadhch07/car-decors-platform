"""FastAPI dependencies exposing database access to routers."""

from typing import Annotated

from fastapi import Depends
from pymongo.asynchronous.database import AsyncDatabase

from app.core.db import mongo


def get_database() -> AsyncDatabase:
    """Return the active database handle.

    Routers depend on this function so tests can inject an isolated database via
    ``app.dependency_overrides``.
    """
    return mongo.database


DatabaseDep = Annotated[AsyncDatabase, Depends(get_database)]
