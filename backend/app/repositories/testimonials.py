"""Testimonial data access.

Query documents passed to these methods are constructed by the testimonial
service exclusively from whitelisted, validated inputs (never from raw request
JSON).
"""

from typing import Any

from app.models.testimonial import Testimonial
from app.repositories.base import BaseRepository


class TestimonialRepository(BaseRepository[Testimonial]):
    collection_name = "testimonials"
    document_model = Testimonial

    async def count_query(self, query: dict[str, Any]) -> int:
        return await self.collection.count_documents(query)

    async def page_query(
        self,
        query: dict[str, Any],
        *,
        sort_keys: list[tuple[str, int]],
        skip: int,
        limit: int,
    ) -> list[Testimonial]:
        """Return one bounded page with server-side ordering."""
        cursor = self.collection.find(query).sort(sort_keys).skip(skip).limit(limit)
        documents = await cursor.to_list(length=None)
        return [Testimonial.model_validate(doc) for doc in documents]