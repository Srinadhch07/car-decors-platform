"""Pydantic document models and request/response schemas."""

from app.models.admin_user import AdminUser, AdminUserRead
from app.models.base import SLUG_PATTERN, BaseDocument, Money, PyObjectId, utc_now
from app.models.category import Category, CategoryCreate, CategoryRead, CategoryUpdate
from app.models.enums import Availability, TestimonialStatus
from app.models.product import (
    AdminProductListPage,
    AdminProductRead,
    Product,
    ProductCreate,
    ProductListPage,
    ProductRead,
    ProductUpdate,
    StockAdjustRequest,
    build_product_create,
    build_product_update,
)
from app.models.shop_settings import (
    ShopSettings,
    ShopSettingsPublic,
    ShopSettingsUpdate,
)
from app.models.subcategory import (
    Subcategory,
    SubcategoryCreate,
    SubcategoryRead,
    SubcategoryUpdate,
)
from app.models.testimonial import (
    Testimonial,
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

__all__ = [
    "SLUG_PATTERN",
    "AdminProductListPage",
    "AdminProductRead",
    "AdminUser",
    "AdminUserRead",
    "Availability",
    "BaseDocument",
    "Category",
    "CategoryCreate",
    "CategoryRead",
    "CategoryUpdate",
    "Money",
    "Product",
    "ProductCreate",
    "ProductListPage",
    "ProductRead",
    "ProductUpdate",
    "PyObjectId",
    "ShopSettings",
    "ShopSettingsPublic",
    "ShopSettingsUpdate",
    "StockAdjustRequest",
    "Subcategory",
    "SubcategoryCreate",
    "SubcategoryRead",
    "SubcategoryUpdate",
    "Testimonial",
    "TestimonialAdminListPage",
    "TestimonialAdminRead",
    "TestimonialFeaturedRequest",
    "TestimonialListPage",
    "TestimonialPublicationRequest",
    "TestimonialRead",
    "TestimonialStatus",
    "TestimonialStatusRequest",
    "TestimonialSubmission",
    "TestimonialUpdate",
    "build_product_create",
    "build_product_update",
    "utc_now",
]
