"""Testimonial endpoints: public submission/reading and admin moderation.

Public submissions are rate limited per client IP, never trusted with
privileged fields, and start in the ``pending`` state. Admin mutations require
both admin authentication and a valid CSRF token.
"""

import logging

from fastapi import APIRouter, HTTPException, Request, status
from pymongo.errors import PyMongoError

from app.api.dependencies import AdminDep, CsrfDep
from app.core.rate_limit import SlidingWindowLimiter
from app.db.dependencies import DatabaseDep
from app.models.base import PyObjectId
from app.models.enums import TestimonialStatus
from app.models.testimonial import (
    TestimonialAdminListPage,
    TestimonialAdminRead,
    TestimonialFeaturedRequest,
    TestimonialListPage,
    TestimonialPublicationRequest,
    TestimonialRead,
    TestimonialStatusRequest,
    TestimonialSubmission,
    TestimonialUpdate,
)
from app.services import testimonials as testimonial_service
from app.services.testimonials import (
    ConflictError,
    InvalidQueryError,
    NotFoundError,
    TestimonialError,
)

logger = logging.getLogger(__name__)

public_router = APIRouter(tags=["testimonials"])
admin_router = APIRouter(tags=["admin-testimonials"])


def _client_ip(request: Request) -> str:
    """Identify a submission source for rate limiting by direct peer address."""
    if request.client is None:
        return "unknown"
    return request.client.host


def _map_testimonial_error(exc: TestimonialError) -> HTTPException:
    if isinstance(exc, NotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, ConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, InvalidQueryError):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        )
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _database_unavailable(detail: str, exc: Exception) -> HTTPException:
    logger.warning("Testimonial database failure: %s", exc)
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------


@public_router.post(
    "/testimonials",
    response_model=TestimonialRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_testimonial(
    payload: TestimonialSubmission,
    request: Request,
    database: DatabaseDep,
) -> TestimonialRead:
    """Accept a new customer testimonial for moderation.

    The response echoes only public fields; moderation state stays internal.
    """
    limiter: SlidingWindowLimiter = request.app.state.testimonial_limiter
    client_key = _client_ip(request)
    if not limiter.allow(client_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many submissions. Please try again later.",
            headers={"Retry-After": str(limiter.retry_after_seconds(client_key))},
        )
    if payload.website:
        raise _bad_request("Submission could not be processed.")
    try:
        return await testimonial_service.submit_testimonial(database, payload)
    except PyMongoError as exc:
        raise _database_unavailable(
            "Your submission could not be saved. Please try again.", exc
        ) from exc


@public_router.get("/testimonials", response_model=TestimonialListPage)
async def list_testimonials(
    database: DatabaseDep,
    page: int = 1,
    page_size: int = 20,
) -> TestimonialListPage:
    """Public listing: only approved, published, consented testimonials."""
    try:
        return await testimonial_service.list_public_testimonials(
            database, page=page, page_size=page_size
        )
    except InvalidQueryError as exc:
        raise _map_testimonial_error(exc) from exc


@public_router.get("/testimonials/featured", response_model=TestimonialListPage)
async def list_featured_testimonials(
    database: DatabaseDep,
    page: int = 1,
    page_size: int = 9,
) -> TestimonialListPage:
    """Featured testimonials for marketing surfaces (homepage, etc.)."""
    try:
        return await testimonial_service.list_featured_testimonials(
            database, page=page, page_size=page_size
        )
    except InvalidQueryError as exc:
        raise _map_testimonial_error(exc) from exc


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


@admin_router.get("/admin/testimonials", response_model=TestimonialAdminListPage)
async def admin_list_testimonials(
    _admin: AdminDep,
    database: DatabaseDep,
    status: TestimonialStatus | None = None,
    page: int = 1,
    page_size: int = 20,
) -> TestimonialAdminListPage:
    """Admin moderation queue with optional status filter."""
    try:
        return await testimonial_service.list_admin_testimonials(
            database, status=status, page=page, page_size=page_size
        )
    except InvalidQueryError as exc:
        raise _map_testimonial_error(exc) from exc


@admin_router.get(
    "/admin/testimonials/{testimonial_id}", response_model=TestimonialAdminRead
)
async def admin_get_testimonial(
    testimonial_id: PyObjectId,
    _admin: AdminDep,
    database: DatabaseDep,
) -> TestimonialAdminRead:
    """Single testimonial including moderation state and private note."""
    try:
        return await testimonial_service.get_admin_testimonial(
            database, testimonial_id
        )
    except NotFoundError as exc:
        raise _map_testimonial_error(exc) from exc


@admin_router.put(
    "/admin/testimonials/{testimonial_id}", response_model=TestimonialAdminRead
)
async def admin_update_testimonial(
    testimonial_id: PyObjectId,
    payload: TestimonialUpdate,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> TestimonialAdminRead:
    """Edit testimonial content and the private moderation note."""
    try:
        return await testimonial_service.update_testimonial(
            database, testimonial_id, payload
        )
    except NotFoundError as exc:
        raise _map_testimonial_error(exc) from exc


@admin_router.patch(
    "/admin/testimonials/{testimonial_id}/status", response_model=TestimonialAdminRead
)
async def admin_set_testimonial_status(
    testimonial_id: PyObjectId,
    payload: TestimonialStatusRequest,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> TestimonialAdminRead:
    """Approve or reject a submission."""
    try:
        return await testimonial_service.set_testimonial_status(
            database, testimonial_id, payload.status
        )
    except NotFoundError as exc:
        raise _map_testimonial_error(exc) from exc


@admin_router.patch(
    "/admin/testimonials/{testimonial_id}/publication", response_model=TestimonialAdminRead
)
async def admin_set_testimonial_publication(
    testimonial_id: PyObjectId,
    payload: TestimonialPublicationRequest,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> TestimonialAdminRead:
    """Publish or unpublish an approved, consented testimonial."""
    try:
        return await testimonial_service.set_testimonial_publication(
            database, testimonial_id, payload.published
        )
    except NotFoundError as exc:
        raise _map_testimonial_error(exc) from exc


@admin_router.patch(
    "/admin/testimonials/{testimonial_id}/feature", response_model=TestimonialAdminRead
)
async def admin_set_testimonial_featured(
    testimonial_id: PyObjectId,
    payload: TestimonialFeaturedRequest,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> TestimonialAdminRead:
    """Feature/unfeature; featuring requires the full public visibility chain."""
    try:
        return await testimonial_service.set_testimonial_featured(
            database, testimonial_id, payload.is_featured
        )
    except (NotFoundError, ConflictError) as exc:
        raise _map_testimonial_error(exc) from exc


@admin_router.delete(
    "/admin/testimonials/{testimonial_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def admin_delete_testimonial(
    testimonial_id: PyObjectId,
    _admin: AdminDep,
    _csrf: CsrfDep,
    database: DatabaseDep,
) -> None:
    """Permanently remove a testimonial."""
    try:
        await testimonial_service.delete_testimonial(database, testimonial_id)
    except NotFoundError as exc:
        raise _map_testimonial_error(exc) from exc