"""Validation tests for the Pydantic document models and schemas."""

import pytest
from bson import ObjectId
from bson.decimal128 import Decimal128
from pydantic import ValidationError

from app.models import (
    Availability,
    Category,
    CategoryCreate,
    Product,
    ProductCreate,
    ShopSettings,
    Subcategory,
    SubcategoryCreate,
    build_product_create,
    build_product_update,
)
from app.models.admin_user import AdminUser


def test_category_defaults_and_slug_pattern() -> None:
    category = Category(name="Interior", slug="car-interior")

    assert category.is_active is True
    assert category.sort_order == 0
    assert category.id is None
    assert category.created_at is not None
    assert category.updated_at is not None


@pytest.mark.parametrize("bad_slug", ["Interior", "car interior", "car_interior", "-car", "car-"])
def test_category_rejects_invalid_slugs(bad_slug: str) -> None:
    with pytest.raises(ValidationError):
        Category(name="Interior", slug=bad_slug)


def test_category_create_allows_omitted_slug() -> None:
    payload = CategoryCreate(name="Exterior")

    assert payload.slug is None


def test_document_id_round_trips_from_alias() -> None:
    object_id = ObjectId()
    category = Category.model_validate({"_id": object_id, "name": "Interior", "slug": "interior"})

    assert category.id == object_id
    dumped = category.model_dump(by_alias=True, exclude_none=True, mode="python")
    assert dumped["_id"] == object_id


def test_admin_user_normalizes_email() -> None:
    user = AdminUser(email="  Admin@Example.COM ", password_hash="hashed")

    assert user.email == "admin@example.com"


def test_admin_user_rejects_invalid_email() -> None:
    with pytest.raises(ValidationError):
        AdminUser(email="not-an-email", password_hash="hashed")


def test_subcategory_requires_valid_category_id() -> None:
    subcategory = Subcategory(category_id=str(ObjectId()), name="Mats", slug="mats")

    assert isinstance(subcategory.category_id, ObjectId)

    with pytest.raises(ValidationError):
        SubcategoryCreate(category_id="not-an-object-id", name="Mats")


def test_product_price_is_decimal128() -> None:
    product = Product(
        category_id=ObjectId(),
        name="Seat Cover",
        slug="seat-cover",
        price="2499.00",
    )

    assert product.price == Decimal128("2499.00")
    assert product.availability is Availability.OUT_OF_STOCK
    assert product.is_active is True


def test_product_price_is_optional() -> None:
    product = ProductCreate(category_id=ObjectId(), name="Seat Cover")

    assert product.price is None


def test_product_accepts_plain_decimal128_from_database() -> None:
    raw = {
        "category_id": ObjectId(),
        "name": "Seat Cover",
        "slug": "seat-cover",
        "price": Decimal128("2499.00"),
    }

    product = Product.model_validate(raw)

    assert isinstance(product.price, Decimal128)
    assert product.price == Decimal128("2499.00")


def test_product_availability_must_be_known_value() -> None:
    with pytest.raises(ValidationError):
        ProductCreate(category_id=ObjectId(), name="Seat Cover", availability="SOLD_OUT")


def test_product_image_url_is_optional_single() -> None:
    product = Product(category_id=ObjectId(), name="Seat Cover", slug="seat-cover")

    assert product.image_url is None

    with_image = Product(
        category_id=ObjectId(),
        name="Seat Cover",
        slug="seat-cover",
        image_url="/media/products/abc.jpg",
    )
    assert with_image.image_url == "/media/products/abc.jpg"


def test_product_name_normalization_and_limits() -> None:
    create = ProductCreate(category_id=ObjectId(), name="  Seat Cover  ")

    assert create.name == "Seat Cover"

    with pytest.raises(ValidationError):
        ProductCreate(category_id=ObjectId(), name="   ")

    with pytest.raises(ValidationError):
        ProductCreate(category_id=ObjectId(), name="x" * 201)


def test_product_vehicle_tags_are_cleaned_and_bounded() -> None:
    create = ProductCreate(
        category_id=ObjectId(),
        name="Seat Cover",
        vehicle_tags=["  Hyundai Creta ", "Kia Seltos", " ", "Universal"],
    )

    assert create.vehicle_tags == ["Hyundai Creta", "Kia Seltos", "Universal"]

    with pytest.raises(ValidationError):
        ProductCreate(category_id=ObjectId(), name="x", vehicle_tags=["a" * 61])

    with pytest.raises(ValidationError):
        ProductCreate(category_id=ObjectId(), name="x", vehicle_tags=[str(i) for i in range(13)])


def test_build_product_create_normalizes_multipart_form() -> None:
    payload = build_product_create(
        {
            "name": "  Premium Seat Covers ",
            "category_id": str(ObjectId()),
            "subcategory_id": "",
            "description": "  Leather  ",
            "price": "",
            "availability": None,
            "is_active": None,
            "vehicle_tags": '["Hyundai Creta", "Hi"]',
        }
    )

    assert payload.name == "Premium Seat Covers"
    assert payload.subcategory_id is None
    assert payload.description == "Leather"
    assert payload.price is None
    assert payload.availability is Availability.OUT_OF_STOCK
    assert payload.is_active is True


def test_build_product_create_rejects_malformed_input() -> None:
    with pytest.raises(ValueError):
        build_product_create(
            {
                "name": "x",
                "category_id": str(ObjectId()),
                "is_active": "maybe",
                "vehicle_tags": "not-json",
            }
        )


def test_build_product_update_clears_via_empty_string() -> None:
    payload = build_product_update(
        {
            "name": "Renamed",
            "clear_fields": "subcategory_id,price",
            "vehicle_tags": "",
        }
    )
    dumped = payload.model_dump(exclude_unset=True)

    assert payload.name == "Renamed"
    assert dumped["subcategory_id"] is None
    assert dumped["price"] is None
    assert dumped["vehicle_tags"] == []


def test_build_product_update_ignores_absent_fields() -> None:
    payload = build_product_update({"name": None, "availability": None})

    assert payload.model_dump(exclude_unset=True) == {}


def test_shop_settings_optional_fields() -> None:
    settings = ShopSettings(shop_name="Car Decor")

    assert settings.email is None
    assert settings.logo_url is None
    assert settings.social_links == {}
    assert settings.business_hours is None
