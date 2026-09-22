"""Application factory and ASGI entry point."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pymongo.errors import PyMongoError

from app.api.routes import auth, catalog, health, products, shop
from app.core.config import Settings, get_settings
from app.core.db import mongo
from app.core.rate_limit import SlidingWindowLimiter
from app.db.indexes import ensure_indexes
from app.storage.base import build_storage


def configure_logging(settings: Settings) -> None:
    """Configure process-wide logging from settings."""
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage startup and shutdown resources."""
    settings = get_settings()
    configure_logging(settings)
    connected = await mongo.connect(
        settings.mongo_uri, settings.mongo_db_name, settings.mongo_timeout_ms
    )
    if connected:
        try:
            await ensure_indexes(mongo.database)
            logging.getLogger("app.main").info("MongoDB indexes ensured.")
        except PyMongoError as exc:
            logging.getLogger("app.main").warning("Failed to ensure indexes: %s", exc)
    try:
        yield
    finally:
        await mongo.close()


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Per-process login rate limiter; transient and in-memory by design.
    app.state.login_limiter = SlidingWindowLimiter(
        max_events=settings.login_rate_limit_max,
        window_seconds=settings.login_rate_limit_window_minutes * 60,
    )

    # Storage adapter is selected from configuration and lives on the app so
    # tests can swap in a fake without touching credentials.
    app.state.storage = build_storage(settings)
    if settings.storage_mode.lower() == "local":
        media_root = Path(settings.storage_local_dir)
        media_root.mkdir(parents=True, exist_ok=True)
        app.mount("/media", StaticFiles(directory=str(media_root)), name="media")

    app.include_router(health.router, prefix=settings.api_prefix)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(shop.router, prefix=settings.api_prefix)
    app.include_router(catalog.public_router, prefix=settings.api_prefix)
    app.include_router(catalog.admin_router, prefix=settings.api_prefix)
    app.include_router(products.public_router, prefix=settings.api_prefix)
    app.include_router(products.admin_router, prefix=settings.api_prefix)

    return app


app = create_app()
