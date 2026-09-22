"""FastAPI dependency exposing the configured storage adapter."""

from typing import Annotated

from fastapi import Depends, Request

from app.storage.base import Storage


def get_storage(request: Request) -> Storage:
    """Return the storage adapter installed on the app instance.

    ``create_app`` sets ``app.state.storage`` from configuration; tests replace
    it with a fake so no credentials are required.
    """
    return request.app.state.storage


StorageDep = Annotated[Storage, Depends(get_storage)]
