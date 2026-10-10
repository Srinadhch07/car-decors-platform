"""Customer testimonials: public submission, moderation, and publication.

Covers the pending-by-default contract, rejection of privileged fields and
spam, rate limiting, the approved+published+consent public visibility chain,
featured surfacing, and the full admin moderation flow with CSRF guarding.
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

import pytest
from bson import ObjectId
from httpx import ASGITransport, AsyncClient
from pymongo.errors import PyMongoError

from app.models.enums import TestimonialStatus
from app.models.testimonial import (
    MAX_CUSTOMER_NAME_LENGTH,
    MAX_TESTIMONIAL_LENGTH,
    Testimonial,
)
from app.repositories.testimonials import TestimonialRepository
from tests.conftest import login_headers

VALID_PAYLOAD: dict[str, Any] = {
    "customer_name": "Ravi K.",
    "text": "Great seat covers and quick delivery!",
    "rating": 5,
    "consent": True,
}


@pytest.fixture
async def testimonial_client(fake_db) -> AsyncIterator[AsyncClient]:
    """Fresh app wired to the fake database (fresh rate limiter per test)."""
    from app.db.dependencies import get_database
    from app.main import create_app

    test_app = create_app()
    test_app.dependency_overrides[get_database] = lambda: fake_db
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
        yield async_client


@pytest.fixture
async def client(testimonial_client) -> AsyncClient:
    return testimonial_client


@pytest.fixture
async def headers(client, seeded_admin) -> dict:
    return await login_headers(client)


async def submit_testimonial(
    client: AsyncClient, **overrides: Any
) -> Any:
    payload = {**VALID_PAYLOAD, **overrides}
    return await client.post("/api/testimonials", json=payload)


async def insert_testimonial(fake_db, **fields: Any) -> dict:
    """Insert a moderately-controlled testimonial directly into the DB."""
    defaults: dict[str, Any] = {
        "customer_name": "Priya S.",
        "text": "Fantastic carbon-look wrap, very professional.",
        "rating": 5,
        "status": TestimonialStatus.APPROVED,
        "published": True,
        "is_featured": False,
        "consent": True,
    }
    defaults.update(fields)
    repository = TestimonialRepository(fake_db)
    created = await repository.create(Testimonial(**defaults))
    return str(created.id)


async def set_created_at(fake_db, testimonial_id: str, value: datetime) -> None:
    repository = TestimonialRepository(fake_db)
    await repository.collection.update_one(
        {"_id": ObjectId(testimonial_id)}, {"$set": {"created_at": value}}
    )


def public_keys(payload: dict) -> set[str]:
    return set(payload.keys())


# ---------------------------------------------------------------------------
# Public submission
# ---------------------------------------------------------------------------


async def test_submission_starts_pending_unpublished_and_not_featured(
    client, headers, fake_db
) -> None:
    response = await submit_testimonial(client)

    assert response.status_code == 201
    body = response.json()
    assert public_keys(body) == {"id", "customer_name", "text", "rating", "created_at"}
    assert body["customer_name"] == "Ravi K."
    assert body["text"] == "Great seat covers and quick delivery!"
    assert body["rating"] == 5

    stored = await TestimonialRepository(fake_db).get_by_id(ObjectId(body["id"]))
    assert stored is not None
    assert stored.status == TestimonialStatus.PENDING
    assert stored.published is False
    assert stored.is_featured is False
    assert stored.consent is True
    assert stored.moderation_note is None

    listing = await client.get("/api/testimonials")
    assert listing.status_code == 200
    assert listing.json()["items"] == []


async def test_submission_defaults_rating_to_none_and_trims_text(client) -> None:
    response = await submit_testimonial(
        client, rating=None, customer_name="  Ravi K.  ", text="  Nice wrap.  "
    )

    assert response.status_code == 201
    body = response.json()
    assert body["rating"] is None
    assert body["customer_name"] == "Ravi K."
    assert body["text"] == "Nice wrap."


async def test_submission_requires_explicit_consent(client) -> None:
    for payload in (
        {**VALID_PAYLOAD, "consent": False},
        {k: v for k, v in VALID_PAYLOAD.items() if k != "consent"},
    ):
        response = await client.post("/api/testimonials", json=payload)
        assert response.status_code == 422


@pytest.mark.parametrize(
    "name,text",
    [
        ("   ", "Some text"),
        ("Name", "    "),
        ("", "Some text"),
        ("Name", ""),
    ],
)
async def test_submission_rejects_blank_name_or_text(client, name, text) -> None:
    response = await submit_testimonial(client, customer_name=name, text=text)

    assert response.status_code == 422


async def test_submission_rejects_control_characters(client) -> None:
    response = await submit_testimonial(client, text="Bad\x00payload inside")

    assert response.status_code == 422


async def test_submission_rejects_oversized_text_and_name(client) -> None:
    response = await submit_testimonial(
        client,
        customer_name="x" * (MAX_CUSTOMER_NAME_LENGTH + 1),
        text="y" * (MAX_TESTIMONIAL_LENGTH + 1),
    )

    assert response.status_code == 422


@pytest.mark.parametrize("rating", [0, 6, -1])
async def test_submission_rejects_out_of_range_rating(client, rating) -> None:
    response = await submit_testimonial(client, rating=rating)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "privileged",
    [
        {"status": "approved"},
        {"published": True},
        {"is_featured": True},
        {"moderation_note": "publish this please"},
    ],
)
async def test_submission_rejects_privileged_fields(client, privileged) -> None:
    response = await submit_testimonial(client, **privileged)

    assert response.status_code == 422
    assert "extra_forbidden" in response.text


async def test_submission_honeypot_is_rejected_and_nothing_stored(
    client, fake_db
) -> None:
    response = await submit_testimonial(client, website="http://spam.example")

    assert response.status_code == 400
    assert await TestimonialRepository(fake_db).count() == 0


async def test_submission_is_rate_limited_per_client(client) -> None:
    from app.core.config import get_settings

    settings = get_settings()
    for _ in range(settings.testimonial_submit_rate_limit_max):
        response = await submit_testimonial(client)
        assert response.status_code == 201

    blocked = await submit_testimonial(client)

    assert blocked.status_code == 429
    assert blocked.headers.get("retry-after") is not None


async def test_submission_database_failure_returns_502(
    client, monkeypatch
) -> None:
    async def broken_create(*_args, **_kwargs) -> Any:
        raise PyMongoError("db connection lost")

    monkeypatch.setattr(TestimonialRepository, "create", broken_create)

    response = await submit_testimonial(client)

    assert response.status_code == 502


# ---------------------------------------------------------------------------
# Public read visibility chain
# ---------------------------------------------------------------------------


async def test_public_list_only_shows_approved_published_consented(
    client, fake_db
) -> None:
    visible = await insert_testimonial(fake_db)
    pending = await insert_testimonial(fake_db, status=TestimonialStatus.PENDING)
    rejected = await insert_testimonial(fake_db, status=TestimonialStatus.REJECTED)
    unpublished = await insert_testimonial(fake_db, published=False)
    no_consent = await insert_testimonial(fake_db, consent=False)

    response = await client.get("/api/testimonials")

    assert response.status_code == 200
    body = response.json()
    ids = [item["id"] for item in body["items"]]
    assert ids == [visible]
    assert pending not in ids
    assert rejected not in ids
    assert unpublished not in ids
    assert no_consent not in ids

    item = body["items"][0]
    assert public_keys(item) == {"id", "customer_name", "text", "rating", "created_at"}
    assert "status" not in item
    assert "moderation_note" not in item


async def test_public_list_orders_newest_first(client, fake_db) -> None:
    older = await insert_testimonial(fake_db)
    newer = await insert_testimonial(fake_db)
    await set_created_at(
        fake_db, older, datetime(2025, 1, 1, tzinfo=UTC).replace(tzinfo=None)
    )
    await set_created_at(
        fake_db, newer, datetime(2026, 1, 1, tzinfo=UTC).replace(tzinfo=None)
    )

    body = (await client.get("/api/testimonials")).json()

    assert [item["id"] for item in body["items"]] == [newer, older]


async def test_public_list_paginates_and_reports_totals(client, fake_db) -> None:
    for _ in range(3):
        await insert_testimonial(fake_db)

    page_one = await client.get("/api/testimonials", params={"page_size": 2})
    assert page_one.status_code == 200
    body = page_one.json()
    assert len(body["items"]) == 2
    assert body["total"] == 3
    assert body["total_pages"] == 2
    assert body["page"] == 1

    page_two = await client.get("/api/testimonials", params={"page": 2, "page_size": 2})
    assert page_two.status_code == 200
    assert len(page_two.json()["items"]) == 1

    empty = await client.get("/api/testimonials", params={"page": 3, "page_size": 2})
    assert empty.status_code == 200
    assert empty.json()["items"] == []
    assert empty.json()["total_pages"] == 2


@pytest.mark.parametrize(
    "params",
    [{"page": 0}, {"page_size": 0}, {"page_size": 101}],
)
async def test_public_list_rejects_invalid_pagination(client, params) -> None:
    response = await client.get("/api/testimonials", params=params)

    assert response.status_code == 422


async def test_empty_public_list(client) -> None:
    response = await client.get("/api/testimonials")

    assert response.status_code == 200
    assert response.json() == {
        "items": [],
        "page": 1,
        "page_size": 20,
        "total": 0,
        "total_pages": 0,
    }


# ---------------------------------------------------------------------------
# Featured
# ---------------------------------------------------------------------------


async def test_featured_only_surfaces_full_visibility_chain(
    client, fake_db
) -> None:
    featured = await insert_testimonial(fake_db, is_featured=True)
    await insert_testimonial(fake_db)  # visible but not featured
    await insert_testimonial(fake_db, is_featured=True, status=TestimonialStatus.PENDING)
    await insert_testimonial(fake_db, is_featured=True, published=False)
    await insert_testimonial(fake_db, is_featured=True, consent=False)

    response = await client.get("/api/testimonials/featured")

    assert response.status_code == 200
    ids = [item["id"] for item in response.json()["items"]]
    assert ids == [featured]


async def test_featured_uses_default_page_size_of_nine(client, fake_db) -> None:
    for _ in range(10):
        await insert_testimonial(fake_db, is_featured=True)

    response = await client.get("/api/testimonials/featured")

    body = response.json()
    assert len(body["items"]) == 9
    assert body["total"] == 10
    assert body["page_size"] == 9


# ---------------------------------------------------------------------------
# Admin moderation
# ---------------------------------------------------------------------------


async def test_admin_list_requires_authentication(client) -> None:
    response = await client.get("/api/admin/testimonials")

    assert response.status_code == 401


async def test_admin_mutation_requires_csrf(client, seeded_admin) -> None:
    await login_headers(client)
    created = await submit_testimonial(client)
    assert created.status_code == 201
    testimonial_id = created.json()["id"]

    response = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/status",
        json={"status": "approved"},
    )

    assert response.status_code == 403


async def test_admin_list_filters_by_status(client, headers, fake_db) -> None:
    pending = await submit_testimonial(client)
    assert pending.status_code == 201
    other = await submit_testimonial(client)
    assert other.status_code == 201

    all_resp = await client.get("/api/admin/testimonials", headers=headers)
    assert all_resp.status_code == 200
    assert all_resp.json()["total"] == 2

    pending_resp = await client.get(
        "/api/admin/testimonials", headers=headers, params={"status": "pending"}
    )
    assert pending_resp.status_code == 200
    assert pending_resp.json()["total"] == 2

    await client.patch(
        f"/api/admin/testimonials/{pending.json()['id']}/status",
        headers=headers,
        json={"status": "approved"},
    )

    filtered = await client.get(
        "/api/admin/testimonials", headers=headers, params={"status": "pending"}
    )
    filtered_ids = [item["id"] for item in filtered.json()["items"]]
    assert pending.json()["id"] not in filtered_ids
    assert other.json()["id"] in filtered_ids


async def test_admin_get_returns_moderation_fields(client, headers) -> None:
    created = await submit_testimonial(client, rating=None)
    testimonial_id = created.json()["id"]

    response = await client.get(
        f"/api/admin/testimonials/{testimonial_id}", headers=headers
    )

    assert response.status_code == 200
    body = response.json()
    assert public_keys(body) == {
        "id",
        "customer_name",
        "text",
        "rating",
        "status",
        "published",
        "is_featured",
        "consent",
        "moderation_note",
        "created_at",
        "updated_at",
    }
    assert body["status"] == "pending"
    assert body["published"] is False
    assert body["is_featured"] is False
    assert body["consent"] is True


async def test_admin_get_missing_testimonial_returns_404(client, headers) -> None:
    response = await client.get(
        f"/api/admin/testimonials/{ObjectId()}", headers=headers
    )

    assert response.status_code == 404


async def test_admin_edits_content_and_moderation_note(client, headers) -> None:
    created = await submit_testimonial(client, text="Original wording")
    testimonial_id = created.json()["id"]

    edited = await client.put(
        f"/api/admin/testimonials/{testimonial_id}",
        headers=headers,
        json={
            "customer_name": "Ravi Kumar",
            "text": "Edited wording",
            "moderation_note": "Approved after clarifying details.",
        },
    )

    assert edited.status_code == 200
    assert edited.json()["customer_name"] == "Ravi Kumar"
    assert edited.json()["text"] == "Edited wording"
    assert edited.json()["moderation_note"] == "Approved after clarifying details."

    cleared = await client.put(
        f"/api/admin/testimonials/{testimonial_id}",
        headers=headers,
        json={"moderation_note": None},
    )
    assert cleared.status_code == 200
    assert cleared.json()["moderation_note"] is None


async def test_admin_approve_then_publish_then_public(client, headers) -> None:
    created = await submit_testimonial(client)
    testimonial_id = created.json()["id"]

    assert (await client.get("/api/testimonials")).json()["items"] == []

    approved = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/status",
        headers=headers,
        json={"status": "approved"},
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    assert (await client.get("/api/testimonials")).json()["items"] == []

    published = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/publication",
        headers=headers,
        json={"published": True},
    )
    assert published.status_code == 200
    assert published.json()["published"] is True

    listing = await client.get("/api/testimonials")
    assert [item["id"] for item in listing.json()["items"]] == [testimonial_id]


async def test_admin_reject_hides_from_public(client, headers) -> None:
    created = await submit_testimonial(client)
    testimonial_id = created.json()["id"]
    await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/publication",
        headers=headers,
        json={"published": True},
    )

    rejected = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/status",
        headers=headers,
        json={"status": "rejected"},
    )

    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert (await client.get("/api/testimonials")).json()["items"] == []


async def test_admin_feature_requires_approved_published_consent(
    client, headers
) -> None:
    created = await submit_testimonial(client)
    testimonial_id = created.json()["id"]

    pending_feature = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/feature",
        headers=headers,
        json={"is_featured": True},
    )
    assert pending_feature.status_code == 409

    await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/status",
        headers=headers,
        json={"status": "approved"},
    )
    unpublished_feature = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/feature",
        headers=headers,
        json={"is_featured": True},
    )
    assert unpublished_feature.status_code == 409

    await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/publication",
        headers=headers,
        json={"published": True},
    )
    featured = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/feature",
        headers=headers,
        json={"is_featured": True},
    )
    assert featured.status_code == 200
    assert featured.json()["is_featured"] is True

    featured_listing = await client.get("/api/testimonials/featured")
    assert [item["id"] for item in featured_listing.json()["items"]] == [
        testimonial_id
    ]

    unfeatured = await client.patch(
        f"/api/admin/testimonials/{testimonial_id}/feature",
        headers=headers,
        json={"is_featured": False},
    )
    assert unfeatured.status_code == 200
    assert unfeatured.json()["is_featured"] is False
    assert (await client.get("/api/testimonials/featured")).json()["items"] == []


async def test_admin_delete_removes_testimonial(client, headers) -> None:
    created = await submit_testimonial(client)
    testimonial_id = created.json()["id"]

    deleted = await client.delete(
        f"/api/admin/testimonials/{testimonial_id}", headers=headers
    )

    assert deleted.status_code == 204
    guarded = await client.get(
        f"/api/admin/testimonials/{testimonial_id}", headers=headers
    )
    assert guarded.status_code == 404

    again = await client.delete(
        f"/api/admin/testimonials/{testimonial_id}", headers=headers
    )
    assert again.status_code == 404