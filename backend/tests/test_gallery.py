"""Work Gallery tests: media validation, admin CRUD, and public visibility.

Exercises the storage lifecycle (upload/replace/delete/rollback), the
publish/feature visibility rules, batch uploads, and the public read surface.
"""

from typing import Any

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.core.config import Settings
from app.models.enums import GalleryMediaType
from app.models.gallery import GalleryItem
from app.repositories.gallery import GalleryRepository
from app.services.gallery import (
    create_gallery_batch,
    create_gallery_item,
    list_featured_gallery_items,
)
from app.storage.base import TooLargeMediaError, UnsupportedMediaError
from app.storage.media import UploadedMedia, validate_media_upload
from tests.conftest import login_headers
from tests.support.fake_storage import MemoStorage

JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 8
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8
WEBP_BYTES = b"RIFF\x12\x34\x56\x78WEBPVP8 " + b"\x00" * 4
MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 8


@pytest.fixture
async def client(product_client) -> AsyncClient:
    return product_client[0]


@pytest.fixture
async def storage(product_client) -> MemoStorage:
    return product_client[1]


@pytest.fixture
async def headers(client: AsyncClient, seeded_admin) -> dict[str, str]:
    return await login_headers(client)


async def post_item(
    client: AsyncClient,
    headers: dict[str, str] | None,
    *,
    filename: str = "photo.jpg",
    content_type: str = "image/jpeg",
    data: bytes = JPEG_BYTES,
    **fields: Any,
):
    body = {key: value for key, value in fields.items() if value is not None}
    return await client.post(
        "/api/admin/gallery",
        headers=headers,
        data=body,
        files={"file": (filename, data, content_type)},
    )


async def insert_item(fake_db, **fields: Any) -> str:
    """Insert a moderately-controlled gallery item directly into the DB."""
    defaults: dict[str, Any] = {
        "title": "Seat Cover Install",
        "description": "Leather seat cover fitting.",
        "category": "Interiors",
        "media_type": GalleryMediaType.IMAGE,
        "storage_key": "gallery/seed.jpg",
        "url": "https://files.test/gallery/seed.jpg",
        "mime_type": "image/jpeg",
        "size_bytes": 32,
        "is_published": True,
        "is_featured": False,
        "display_order": 0,
    }
    defaults.update(fields)
    repository = GalleryRepository(fake_db)
    created = await repository.create(GalleryItem(**defaults))
    return str(created.id)


async def make_upload(
    data: bytes = JPEG_BYTES,
    *,
    filename: str = "photo.jpg",
    content_type: str = "image/jpeg",
):
    import io

    from fastapi import UploadFile
    from starlette.datastructures import Headers

    return UploadFile(
        file=io.BytesIO(data),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


# ---------------------------------------------------------------------------
# Media validation
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("data", "filename", "content_type", "expected_type"),
    [
        (JPEG_BYTES, "photo.jpg", "image/jpeg", "image"),
        (JPEG_BYTES, "photo.jpeg", "image/jpeg", "image"),
        (PNG_BYTES, "photo.png", "image/png", "image"),
        (WEBP_BYTES, "photo.webp", "image/webp", "image"),
        (MP4_BYTES, "clip.mp4", "video/mp4", "video"),
    ],
)
async def test_supported_media_is_accepted(
    data: bytes, filename: str, content_type: str, expected_type: str
) -> None:
    settings = Settings()
    media = await validate_media_upload(
        settings, await make_upload(data, filename=filename, content_type=content_type)
    )
    assert media.media_type == expected_type
    assert media.key.startswith("gallery/")
    assert media.size == len(data)


async def test_unsupported_media_type_rejected() -> None:
    with pytest.raises(UnsupportedMediaError):
        await validate_media_upload(
            Settings(),
            await make_upload(b"%PDF-1.4", filename="doc.pdf", content_type="application/pdf"),
        )


async def test_media_extension_mismatch_rejected() -> None:
    with pytest.raises(UnsupportedMediaError):
        await validate_media_upload(
            Settings(),
            await make_upload(JPEG_BYTES, filename="photo.png", content_type="image/jpeg"),
        )


async def test_media_signature_mismatch_rejected() -> None:
    with pytest.raises(UnsupportedMediaError):
        # PNG bytes hiding behind a JPEG content type.
        await validate_media_upload(
            Settings(),
            await make_upload(PNG_BYTES, filename="photo.jpg", content_type="image/jpeg"),
        )


async def test_oversized_image_rejected() -> None:
    with pytest.raises(TooLargeMediaError):
        await validate_media_upload(
            Settings(gallery_image_max_bytes=16),
            await make_upload(JPEG_BYTES + b"\x00" * 32),
        )


async def test_oversized_video_rejected() -> None:
    with pytest.raises(TooLargeMediaError):
        await validate_media_upload(
            Settings(gallery_video_max_bytes=16),
            await make_upload(
                MP4_BYTES + b"\x00" * 32, filename="clip.mp4", content_type="video/mp4"
            ),
        )


async def test_video_under_limit_accepted() -> None:
    big = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * (2 * 1024 * 1024)
    media = await validate_media_upload(
        Settings(),
        await make_upload(big, filename="clip.mp4", content_type="video/mp4"),
    )
    assert media.media_type == "video"
    assert media.size > 1024 * 1024


# ---------------------------------------------------------------------------
# Admin create
# ---------------------------------------------------------------------------


async def test_create_requires_authentication(client: AsyncClient) -> None:
    response = await post_item(client, None, title="Halloween")
    assert response.status_code == 401


async def test_create_requires_csrf(client: AsyncClient, seeded_admin) -> None:
    await login_headers(client)
    response = await client.post(
        "/api/admin/gallery",
        data={"title": "Halloween"},
        files={"file": ("photo.jpg", JPEG_BYTES, "image/jpeg")},
    )
    assert response.status_code == 403


async def test_create_image_item(client: AsyncClient, headers, storage: MemoStorage) -> None:
    response = await post_item(
        client, headers, title="Custom Wrap", description="Matte wrap", category="Wraps"
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["title"] == "Custom Wrap"
    assert body["category"] == "Wraps"
    assert body["media_type"] == "image"
    assert body["is_published"] is False
    assert body["is_featured"] is False
    assert body["storage_key"].startswith("gallery/")
    assert body["url"].startswith("https://files.test/gallery/")
    assert body["storage_key"] in storage.objects


async def test_create_video_item(client: AsyncClient, headers) -> None:
    response = await post_item(
        client,
        headers,
        title="Detailing Clip",
        filename="clip.mp4",
        content_type="video/mp4",
        data=MP4_BYTES,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["media_type"] == "video"
    assert body["mime_type"] == "video/mp4"
    assert body["storage_key"].endswith(".mp4")


async def test_create_derives_title_from_filename(client: AsyncClient, headers) -> None:
    response = await post_item(client, headers, filename="dashboard-glow.jpg")
    assert response.status_code == 201, response.text
    assert response.json()["title"] == "dashboard-glow"


async def test_create_accepts_image_over_one_megabyte(
    client: AsyncClient, headers
) -> None:
    # File parts must not be capped by Starlette's 1 MiB text-field limit.
    payload = JPEG_BYTES + b"\x00" * (1_500_000)
    response = await post_item(client, headers, title="Large", data=payload)
    assert response.status_code == 201, response.text


async def test_create_rejects_unsupported_file(client: AsyncClient, headers) -> None:
    response = await post_item(
        client, headers, filename="doc.pdf", content_type="application/pdf", data=b"%PDF"
    )
    assert response.status_code == 400


async def test_create_requires_a_file(client: AsyncClient, headers) -> None:
    response = await client.post("/api/admin/gallery", headers=headers, data={"title": "None"})
    assert response.status_code == 422


async def test_create_storage_failure_surfaces_502(
    client: AsyncClient, headers, storage: MemoStorage
) -> None:
    storage.fail_upload = True
    response = await post_item(client, headers, title="Storage Down")
    assert response.status_code == 502
    assert storage.objects == set()


async def test_create_db_failure_cleans_up_upload(
    fake_db, monkeypatch
) -> None:
    storage = MemoStorage()

    async def fail_create(self, model):  # noqa: ANN001
        raise RuntimeError("db down")

    monkeypatch.setattr(GalleryRepository, "create", fail_create)
    upload = UploadedMedia(
        key="gallery/abc.jpg",
        content_type="image/jpeg",
        data=JPEG_BYTES,
        media_type="image",
        size=len(JPEG_BYTES),
        filename="photo.jpg",
    )
    from app.models.gallery import GalleryCreate

    with pytest.raises(RuntimeError):
        await create_gallery_item(fake_db, storage, GalleryCreate(title="X"), upload)
    assert storage.objects == set()
    assert storage.deleted == ["gallery/abc.jpg"]


# ---------------------------------------------------------------------------
# Batch uploads
# ---------------------------------------------------------------------------


async def test_batch_upload_creates_items(client: AsyncClient, headers) -> None:
    response = await client.post(
        "/api/admin/gallery/batch",
        headers=headers,
        data={"category": "Interiors"},
        files=[
            ("files", ("a.jpg", JPEG_BYTES, "image/jpeg")),
            ("files", ("b.png", PNG_BYTES, "image/png")),
        ],
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["failures"] == []
    assert [item["title"] for item in body["items"]] == ["a", "b"]
    assert all(item["category"] == "Interiors" for item in body["items"])
    # Sequential display order is assigned for a stable gallery order.
    assert [item["display_order"] for item in body["items"]] == [0, 1]


async def test_batch_reports_validation_failures(client: AsyncClient, headers) -> None:
    response = await client.post(
        "/api/admin/gallery/batch",
        headers=headers,
        files=[
            ("files", ("good.jpg", JPEG_BYTES, "image/jpeg")),
            ("files", ("bad.pdf", b"%PDF", "application/pdf")),
        ],
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert len(body["items"]) == 1
    assert len(body["failures"]) == 1
    assert body["failures"][0]["filename"] == "bad.pdf"


async def test_batch_rejects_too_many_files(client: AsyncClient, headers) -> None:
    files = [("files", (f"p{i}.jpg", JPEG_BYTES, "image/jpeg")) for i in range(11)]
    response = await client.post("/api/admin/gallery/batch", headers=headers, files=files)
    assert response.status_code == 422


async def test_batch_storage_failure_leaves_no_objects(
    client: AsyncClient, headers, storage: MemoStorage
) -> None:
    storage.fail_upload = True
    response = await client.post(
        "/api/admin/gallery/batch",
        headers=headers,
        files=[
            ("files", ("a.jpg", JPEG_BYTES, "image/jpeg")),
            ("files", ("b.jpg", JPEG_BYTES, "image/jpeg")),
        ],
    )
    assert response.status_code == 502
    assert storage.objects == set()


async def test_batch_db_failure_rolls_back(fake_db, monkeypatch) -> None:
    storage = MemoStorage()

    async def fail_create(self, model):  # noqa: ANN001
        raise RuntimeError("db down")

    monkeypatch.setattr(GalleryRepository, "create", fail_create)
    uploads = [
        UploadedMedia(
            key=f"gallery/{name}.jpg",
            content_type="image/jpeg",
            data=JPEG_BYTES,
            media_type="image",
            size=len(JPEG_BYTES),
            filename=name,
        )
        for name in ("one", "two")
    ]
    with pytest.raises(RuntimeError):
        await create_gallery_batch(fake_db, storage, uploads)
    assert storage.objects == set()


# ---------------------------------------------------------------------------
# Publish / feature rules
# ---------------------------------------------------------------------------


async def test_feature_requires_publication(client: AsyncClient, headers) -> None:
    created = (await post_item(client, headers, title="Draft")).json()
    response = await client.patch(
        f"/api/admin/gallery/{created['id']}/feature",
        headers=headers,
        json={"is_featured": True},
    )
    assert response.status_code == 409


async def test_publish_then_feature_then_unpublish_clears_feature(
    client: AsyncClient, headers
) -> None:
    created = (await post_item(client, headers, title="Live")).json()

    published = await client.patch(
        f"/api/admin/gallery/{created['id']}/publication",
        headers=headers,
        json={"is_published": True},
    )
    assert published.status_code == 200
    assert published.json()["is_published"] is True

    featured = await client.patch(
        f"/api/admin/gallery/{created['id']}/feature",
        headers=headers,
        json={"is_featured": True},
    )
    assert featured.status_code == 200
    assert featured.json()["is_featured"] is True

    unpublished = await client.patch(
        f"/api/admin/gallery/{created['id']}/publication",
        headers=headers,
        json={"is_published": False},
    )
    assert unpublished.status_code == 200
    assert unpublished.json()["is_published"] is False
    assert unpublished.json()["is_featured"] is False


# ---------------------------------------------------------------------------
# Public surface
# ---------------------------------------------------------------------------


async def test_public_listing_hides_drafts(client: AsyncClient, fake_db) -> None:
    await insert_item(fake_db, title="Draft", is_published=False)
    await insert_item(fake_db, title="Live", is_published=True)

    response = await client.get("/api/gallery")
    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["items"]]
    assert titles == ["Live"]
    assert "storage_key" not in response.json()["items"][0]


async def test_public_listing_filters_by_media_type_and_category(
    client: AsyncClient, fake_db
) -> None:
    await insert_item(fake_db, title="Pic", category="Wraps", media_type=GalleryMediaType.IMAGE)
    await insert_item(
        fake_db,
        title="Clip",
        category="Detailing",
        media_type=GalleryMediaType.VIDEO,
        storage_key="gallery/clip.mp4",
        url="https://files.test/gallery/clip.mp4",
        mime_type="video/mp4",
    )

    by_type = await client.get("/api/gallery", params={"media_type": "video"})
    assert [item["title"] for item in by_type.json()["items"]] == ["Clip"]

    by_category = await client.get("/api/gallery", params={"category": "Wraps"})
    assert [item["title"] for item in by_category.json()["items"]] == ["Pic"]


async def test_public_listing_orders_by_display_order(client: AsyncClient, fake_db) -> None:
    await insert_item(fake_db, title="Second", display_order=2)
    await insert_item(fake_db, title="First", display_order=1)

    response = await client.get("/api/gallery")
    assert [item["title"] for item in response.json()["items"]] == ["First", "Second"]


async def test_public_detail_draft_is_404(client: AsyncClient, fake_db) -> None:
    draft = await insert_item(fake_db, title="Draft", is_published=False)
    published = await insert_item(fake_db, title="Live", is_published=True)

    assert (await client.get(f"/api/gallery/{draft}")).status_code == 404
    assert (await client.get(f"/api/gallery/{published}")).status_code == 200


async def test_featured_endpoint_only_published_featured(client: AsyncClient, fake_db) -> None:
    await insert_item(fake_db, title="Featured", is_published=True, is_featured=True)
    await insert_item(fake_db, title="Plain", is_published=True, is_featured=False)
    await insert_item(fake_db, title="Hidden", is_published=False, is_featured=True)

    response = await client.get("/api/gallery/featured")
    assert [item["title"] for item in response.json()["items"]] == ["Featured"]


async def test_invalid_sort_and_pagination_rejected(client: AsyncClient) -> None:
    assert (await client.get("/api/gallery", params={"sort": "bogus"})).status_code == 422
    assert (await client.get("/api/gallery", params={"page": 0})).status_code == 422


# ---------------------------------------------------------------------------
# Update / replace / delete
# ---------------------------------------------------------------------------


async def test_update_metadata_only_keeps_media(client: AsyncClient, headers) -> None:
    created = (await post_item(client, headers, title="Before")).json()
    response = await client.put(
        f"/api/admin/gallery/{created['id']}",
        headers=headers,
        data={"title": "After", "description": "Updated"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["title"] == "After"
    assert body["description"] == "Updated"
    assert body["storage_key"] == created["storage_key"]


async def test_update_replaces_media_and_deletes_old(
    client: AsyncClient, headers, storage: MemoStorage
) -> None:
    created = (await post_item(client, headers, title="Swap")).json()
    old_key = created["storage_key"]

    response = await client.put(
        f"/api/admin/gallery/{created['id']}",
        headers=headers,
        files={"file": ("new.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["storage_key"] != old_key
    assert old_key in storage.deleted
    assert old_key not in storage.objects
    assert body["storage_key"] in storage.objects


async def test_update_can_clear_category(client: AsyncClient, headers) -> None:
    created = (await post_item(client, headers, title="Cat", category="Wraps")).json()
    response = await client.put(
        f"/api/admin/gallery/{created['id']}",
        headers=headers,
        data={"clear_fields": "category"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["category"] is None


async def test_delete_removes_record_and_object(
    client: AsyncClient, headers, storage: MemoStorage
) -> None:
    created = (await post_item(client, headers, title="Gone")).json()
    key = created["storage_key"]

    response = await client.delete(f"/api/admin/gallery/{created['id']}", headers=headers)
    assert response.status_code == 204
    assert key in storage.deleted
    detail = await client.get(f"/api/admin/gallery/{created['id']}", headers=headers)
    assert detail.status_code == 404


async def test_delete_storage_failure_surfaces_502(
    client: AsyncClient, headers, storage: MemoStorage
) -> None:
    created = (await post_item(client, headers, title="Sticky")).json()
    storage.fail_delete = True
    response = await client.delete(f"/api/admin/gallery/{created['id']}", headers=headers)
    assert response.status_code == 502
    # The record is gone even though cleanup failed; the API reports the failure.
    detail = await client.get(f"/api/admin/gallery/{created['id']}", headers=headers)
    assert detail.status_code == 404


async def test_order_endpoint_changes_public_order(client: AsyncClient, headers) -> None:
    first = (await post_item(client, headers, title="First")).json()
    second = (await post_item(client, headers, title="Second")).json()
    for item in (first, second):
        await client.patch(
            f"/api/admin/gallery/{item['id']}/publication",
            headers=headers,
            json={"is_published": True},
        )

    response = await client.patch(
        f"/api/admin/gallery/{second['id']}/order",
        headers=headers,
        json={"display_order": 0},
    )
    assert response.status_code == 200
    assert response.json()["display_order"] == 0
    # Move the first one after the second for a deterministic order.
    await client.patch(
        f"/api/admin/gallery/{first['id']}/order",
        headers=headers,
        json={"display_order": 5},
    )

    listing = await client.get("/api/gallery")
    assert [item["title"] for item in listing.json()["items"]] == ["Second", "First"]


async def test_admin_list_filters_by_publication(client: AsyncClient, headers) -> None:
    draft = (await post_item(client, headers, title="Draft")).json()
    live = (await post_item(client, headers, title="Live")).json()
    await client.patch(
        f"/api/admin/gallery/{live['id']}/publication",
        headers=headers,
        json={"is_published": True},
    )

    response = await client.get(
        "/api/admin/gallery", headers=headers, params={"is_published": True}
    )
    assert [item["title"] for item in response.json()["items"]] == ["Live"]
    assert draft["is_published"] is False


async def test_delete_missing_item_is_404(client: AsyncClient, headers) -> None:
    response = await client.delete(
        "/api/admin/gallery/64b7f9c2f1a4e5d6c7b8a901", headers=headers
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Model / service edge cases
# ---------------------------------------------------------------------------


async def test_featured_listing_service(fake_db) -> None:
    await insert_item(fake_db, title="F", is_published=True, is_featured=True)
    page = await list_featured_gallery_items(fake_db)
    assert page.total == 1
    assert page.items[0].title == "F"


def test_model_rejects_blank_title_and_normalizes_category() -> None:
    with pytest.raises(ValidationError):
        GalleryItem(
            title="   ",
            media_type=GalleryMediaType.IMAGE,
            storage_key="gallery/x.jpg",
            url="/media/gallery/x.jpg",
            mime_type="image/jpeg",
        )
    item = GalleryItem(
        title="Ok",
        category="   ",
        media_type=GalleryMediaType.IMAGE,
        storage_key="gallery/x.jpg",
        url="/media/gallery/x.jpg",
        mime_type="image/jpeg",
    )
    assert item.category is None
