"""Shared Pydantic primitives for MongoDB documents."""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from bson import ObjectId
from bson.decimal128 import Decimal128
from pydantic import BaseModel, ConfigDict, Field
from pydantic_core import core_schema

#: Pattern used for human-readable, URL-safe slugs.
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


def utc_now() -> datetime:
    """Return the current UTC time as a timezone-naive datetime.

    PyMongo stores datetimes as UTC milliseconds and returns naive datetimes by
    default, so producing naive UTC keeps round-tripped values consistent.
    """
    return datetime.now(UTC).replace(tzinfo=None)


class PyObjectId(ObjectId):
    """A BSON ObjectId that serializes to a string in JSON output only."""

    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._convert,
            serialization=core_schema.to_string_ser_schema(when_used="json"),
        )

    @classmethod
    def _convert(cls, value: Any) -> "PyObjectId":
        if isinstance(value, PyObjectId):
            return value
        if isinstance(value, ObjectId):
            return cls(value)
        if isinstance(value, str) and ObjectId.is_valid(value):
            return cls(value)
        raise ValueError("Invalid ObjectId")


class Money(Decimal128):
    """An INR money amount stored as BSON Decimal128 to avoid float rounding."""

    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: Any
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._convert,
            serialization=core_schema.to_string_ser_schema(when_used="json"),
        )

    @classmethod
    def _convert(cls, value: Any) -> "Money":
        if isinstance(value, Money):
            return value
        if isinstance(value, Decimal128):
            return cls(value.to_decimal())
        if isinstance(value, (Decimal, int, float, str)):
            return cls(str(value))
        raise ValueError("Invalid money value")


class BaseDocument(BaseModel):
    """Fields shared by every stored MongoDB document."""

    model_config = ConfigDict(populate_by_name=True)

    id: PyObjectId | None = Field(default=None, alias="_id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
