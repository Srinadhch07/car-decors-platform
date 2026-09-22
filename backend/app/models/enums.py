"""Enumerations shared across models and schemas."""

from enum import StrEnum


class Availability(StrEnum):
    """Product availability states. No quantity-based inventory in V1."""

    IN_STOCK = "IN_STOCK"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    ON_ORDER = "ON_ORDER"
