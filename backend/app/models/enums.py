"""Enumerations shared across models and schemas."""

from enum import StrEnum


class Availability(StrEnum):
    """Product availability states. No quantity-based inventory in V1."""

    IN_STOCK = "IN_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    ON_ORDER = "ON_ORDER"


class TestimonialStatus(StrEnum):
    """Moderation lifecycle of a customer testimonial.

    New submissions always start as ``pending``. Only ``approved`` and
    explicitly ``published`` testimonials with consent are ever visible.
    """

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class GalleryMediaType(StrEnum):
    """Kind of media stored in a Work Gallery item.

    Images and videos share one collection; the kind is persisted so listings
    can filter and clients can pick the right renderer without inspecting mime
    types.
    """

    IMAGE = "image"
    VIDEO = "video"
