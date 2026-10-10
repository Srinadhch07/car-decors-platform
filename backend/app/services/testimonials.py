"""Testimonial submission, moderation, publication, and visibility rules.

The visibility chain for public testimonials is always: ``approved`` status AND
``published`` AND explicit ``consent``. Featuring additionally requires
``is_featured`` and is only possible once the visibility chain already holds.
"""

import logging
import math
from typing import Any

from bson import ObjectId
from pymongo.asynchronous.database import AsyncDatabase

from app.models.enums import TestimonialStatus
from app.models.testimonial import (
    Testimonial,
    TestimonialAdminListPage,
    TestimonialAdminRead,
    TestimonialListPage,
    TestimonialRead,
    TestimonialSubmission,
    TestimonialUpdate,
)
from app.repositories.testimonials import TestimonialRepository

logger = logging.getLogger(__name__)

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 20
#: Homepage sentiment is served from this page size.
DEFAULT_FEATURED_PAGE_SIZE = 9

#: Every public testimonial must satisfy all three predicates.
PUBLIC_QUERY: dict[str, Any] = {
    "status": TestimonialStatus.APPROVED.value,
    "published": True,
    "consent": True,
}

#: Newest public testimonials first.
PUBLIC_SORT_KEYS: list[tuple[str, int]] = [("created_at", -1)]


class TestimonialError(Exception):
    """Base for testimonial domain errors."""


class NotFoundError(TestimonialError):
    """Requested testimonial does not exist."""


class ConflictError(TestimonialError):
    """Action conflicts with the visibility chain (e.g. featuring unpublished)."""


class InvalidQueryError(TestimonialError):
    """Pagination or filter arguments are outside the contract."""


def _validate_pagination(page: int, page_size: int) -> tuple[int, int, int]:
    if page < 1:
        raise InvalidQueryError("page must be >= 1")
    if page_size < 1:
        raise InvalidQueryError("page_size must be >= 1")
    if page_size > MAX_PAGE_SIZE:
        raise InvalidQueryError(f"page_size must be <= {MAX_PAGE_SIZE}")
    return (page - 1) * page_size, page, page_size


def _total_pages(total: int, page_size: int) -> int:
    if total == 0:
        return 0
    return math.ceil(total / page_size)


def _read_public(testimonial: Testimonial) -> TestimonialRead:
    return TestimonialRead.model_validate(testimonial)


def _read_admin(testimonial: Testimonial) -> TestimonialAdminRead:
    return TestimonialAdminRead.model_validate(testimonial)


def _build_public_page(
    items: list[Testimonial], total: int, *, page: int, page_size: int
) -> TestimonialListPage:
    return TestimonialListPage(
        items=[_read_public(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=_total_pages(total, page_size),
    )


def _build_admin_page(
    items: list[Testimonial], total: int, *, page: int, page_size: int
) -> TestimonialAdminListPage:
    return TestimonialAdminListPage(
        items=[_read_admin(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=_total_pages(total, page_size),
    )


def _empty_public_page(page: int, page_size: int) -> TestimonialListPage:
    _, resolved_page, resolved_size = _validate_pagination(page, page_size)
    return _build_public_page([], 0, page=resolved_page, page_size=resolved_size)


async def submit_testimonial(
    database: AsyncDatabase, payload: TestimonialSubmission
) -> TestimonialRead:
    """Persist a new submission as pending, unpublished, and not featured."""
    repository = TestimonialRepository(database)
    document = Testimonial(
        customer_name=payload.customer_name,
        text=payload.text,
        rating=payload.rating,
        consent=payload.consent,
    )
    created = await repository.create(document)
    return _read_public(created)


async def list_public_testimonials(
    database: AsyncDatabase, *, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE
) -> TestimonialListPage:
    skip, resolved_page, resolved_size = _validate_pagination(page, page_size)
    repository = TestimonialRepository(database)
    total = await repository.count_query(PUBLIC_QUERY)
    items = await repository.page_query(
        PUBLIC_QUERY, sort_keys=PUBLIC_SORT_KEYS, skip=skip, limit=resolved_size
    )
    return _build_public_page(items, total, page=resolved_page, page_size=resolved_size)


async def list_featured_testimonials(
    database: AsyncDatabase,
    *,
    page: int = 1,
    page_size: int = DEFAULT_FEATURED_PAGE_SIZE,
) -> TestimonialListPage:
    """Public featured testimonials; an empty set when none are featured."""
    query = {**PUBLIC_QUERY, "is_featured": True}
    skip, resolved_page, resolved_size = _validate_pagination(page, page_size)
    repository = TestimonialRepository(database)
    total = await repository.count_query(query)
    items = await repository.page_query(
        query, sort_keys=PUBLIC_SORT_KEYS, skip=skip, limit=resolved_size
    )
    return _build_public_page(items, total, page=resolved_page, page_size=resolved_size)


async def list_admin_testimonials(
    database: AsyncDatabase,
    *,
    status: TestimonialStatus | None = None,
    page: int = 1,
    page_size: int = DEFAULT_PAGE_SIZE,
) -> TestimonialAdminListPage:
    query: dict[str, Any] = {}
    if status is not None:
        query["status"] = status.value
    skip, resolved_page, resolved_size = _validate_pagination(page, page_size)
    repository = TestimonialRepository(database)
    total = await repository.count_query(query)
    items = await repository.page_query(
        query, sort_keys=[("created_at", -1)], skip=skip, limit=resolved_size
    )
    return _build_admin_page(items, total, page=resolved_page, page_size=resolved_size)


async def get_admin_testimonial(
    database: AsyncDatabase, testimonial_id: ObjectId
) -> TestimonialAdminRead:
    document = await TestimonialRepository(database).get_by_id(testimonial_id)
    if document is None:
        raise NotFoundError("Testimonial not found")
    return _read_admin(document)


async def update_testimonial(
    database: AsyncDatabase,
    testimonial_id: ObjectId,
    payload: TestimonialUpdate,
) -> TestimonialAdminRead:
    """Edit testimonial content and moderation note (content-level edit)."""
    repository = TestimonialRepository(database)
    current = await repository.get_by_id(testimonial_id)
    if current is None:
        raise NotFoundError("Testimonial not found")
    changes = payload.model_dump(exclude_unset=True)
    if changes:
        await repository.update(testimonial_id, changes)
        updated = await repository.get_by_id(testimonial_id)
        if updated is None:
            raise NotFoundError("Testimonial not found")
        return _read_admin(updated)
    return _read_admin(current)


async def set_testimonial_status(
    database: AsyncDatabase,
    testimonial_id: ObjectId,
    status: TestimonialStatus,
) -> TestimonialAdminRead:
    """Approve/reject a submission, keeping publication intact."""
    repository = TestimonialRepository(database)
    current = await repository.get_by_id(testimonial_id)
    if current is None:
        raise NotFoundError("Testimonial not found")
    await repository.update(testimonial_id, {"status": status.value})
    updated = await repository.get_by_id(testimonial_id)
    if updated is None:
        raise NotFoundError("Testimonial not found")
    return _read_admin(updated)


async def set_testimonial_publication(
    database: AsyncDatabase,
    testimonial_id: ObjectId,
    published: bool,
) -> TestimonialAdminRead:
    """Publish or unpublish an approved, consented testimonial."""
    repository = TestimonialRepository(database)
    current = await repository.get_by_id(testimonial_id)
    if current is None:
        raise NotFoundError("Testimonial not found")
    await repository.update(testimonial_id, {"published": published})
    updated = await repository.get_by_id(testimonial_id)
    if updated is None:
        raise NotFoundError("Testimonial not found")
    return _read_admin(updated)


async def set_testimonial_featured(
    database: AsyncDatabase,
    testimonial_id: ObjectId,
    is_featured: bool,
) -> TestimonialAdminRead:
    """Feature or unfeature a testimonial already on the visibility chain.

    Featuring requires the testimonial to be approved, published, and
    consented; otherwise the change would silently advertise a testimonial
    that is not publicly visible.
    """
    repository = TestimonialRepository(database)
    current = await repository.get_by_id(testimonial_id)
    if current is None:
        raise NotFoundError("Testimonial not found")
    if is_featured and not (
        current.status == TestimonialStatus.APPROVED
        and current.published
        and current.consent
    ):
        raise ConflictError(
            "Only an approved, published testimonial with explicit consent "
            "can be featured"
        )
    await repository.update(testimonial_id, {"is_featured": is_featured})
    updated = await repository.get_by_id(testimonial_id)
    if updated is None:
        raise NotFoundError("Testimonial not found")
    return _read_admin(updated)


async def delete_testimonial(
    database: AsyncDatabase, testimonial_id: ObjectId
) -> None:
    deleted = await TestimonialRepository(database).delete(testimonial_id)
    if not deleted:
        raise NotFoundError("Testimonial not found")