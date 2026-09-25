"""Public SEO endpoints.

Today this module only hosts the dynamic XML sitemap. It is served at the root
path (``/sitemap.xml``), outside the ``/api`` prefix, so crawlers can reach it
without any API knowledge. The sitemap mirrors the exact public-visibility
rules the catalog uses: a product is listed only when it is active, its
category is active, and (when present) its subcategory is active.
"""

import html

from fastapi import APIRouter, Response
from pymongo.errors import PyMongoError

from app.core.config import get_settings
from app.db.dependencies import DatabaseDep
from app.repositories.categories import CategoryRepository
from app.repositories.products import ProductRepository
from app.repositories.subcategories import SubcategoryRepository

router = APIRouter(tags=["seo"])

#: Hard-coded storefront routes that exist regardless of catalog content.
#: Each entry is ``(path, changefreq, priority)``.
_STATIC_ROUTES: tuple[tuple[str, str, str], ...] = (
    ("/", "daily", "1.0"),
    ("/products", "daily", "0.9"),
    ("/about", "monthly", "0.5"),
    ("/contact", "monthly", "0.6"),
)

#: Sitemap protocol hard limit on URL count.
_MAX_URLS = 50_000


def _storefront_base_url() -> str:
    """Return the storefront origin used as the sitemap host."""
    url = get_settings().frontend_url.strip().rstrip("/")
    return url or "https://car-decors.duckdns.org"


def _escape(value: str) -> str:
    return html.escape(value, quote=True)


def _w3c_date(value: object) -> str | None:
    """Return the ``<lastmod>`` date part (W3C date) from a datetime."""
    date_value = getattr(value, "date", None)
    if callable(date_value):
        return date_value().isoformat()
    return None


def _url_entry(
    base_url: str,
    path: str,
    *,
    lastmod: str | None = None,
    changefreq: str | None = None,
    priority: str | None = None,
) -> str:
    parts = ["  <url>", f"    <loc>{_escape(base_url + path)}</loc>"]
    if lastmod is not None:
        parts.append(f"    <lastmod>{_escape(lastmod)}</lastmod>")
    if changefreq is not None:
        parts.append(f"    <changefreq>{_escape(changefreq)}</changefreq>")
    if priority is not None:
        parts.append(f"    <priority>{_escape(priority)}</priority>")
    parts.append("  </url>")
    return "\n".join(parts)


@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml(database: DatabaseDep) -> Response:
    """Return the XML sitemap of publicly reachable storefront URLs."""
    base_url = _storefront_base_url()

    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

    for path, changefreq, priority in _STATIC_ROUTES:
        lines.append(_url_entry(base_url, path, changefreq=changefreq, priority=priority))

    try:
        category_repository = CategoryRepository(database)
        subcategory_repository = SubcategoryRepository(database)
        product_repository = ProductRepository(database)

        categories = await category_repository.list_active()
        active_category_ids = {category.id for category in categories if category.id is not None}

        for category in categories:
            if category.slug:
                lines.append(
                    _url_entry(
                        base_url,
                        f"/categories/{category.slug}",
                        lastmod=_w3c_date(category.updated_at),
                        changefreq="weekly",
                        priority="0.8",
                    )
                )

        active_subcategories = [
            subcategory
            for subcategory in await subcategory_repository.list_with_query({"is_active": True})
            if subcategory.category_id in active_category_ids and subcategory.id is not None
        ]
        visible_subcategory_ids = {subcategory.id for subcategory in active_subcategories}

        products = [
            product
            for product in await product_repository.fetch_query({"is_active": True})
            if product.category_id in active_category_ids
            and (
                product.subcategory_id is None
                or product.subcategory_id in visible_subcategory_ids
            )
        ]

        for product in products[:_MAX_URLS]:
            if product.slug:
                lines.append(
                    _url_entry(
                        base_url,
                        f"/products/{product.slug}",
                        lastmod=_w3c_date(product.updated_at),
                        changefreq="weekly",
                        priority="0.7",
                    )
                )
    except PyMongoError:
        return Response(
            content="Sitemap unavailable",
            status_code=503,
            media_type="text/plain; charset=utf-8",
        )

    lines.append("</urlset>")
    return Response(content="\n".join(lines), media_type="application/xml; charset=utf-8")