"""URL-safe slug generation from human-readable names."""

import re

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
_MULTI_HYPHEN = re.compile(r"-{2,}")


def slugify(text: str) -> str:
    """Convert text into a URL-safe slug.

    Lowercases, collapses any run of non-alphanumeric characters into a single
    hyphen, and strips edge hyphens. Returns ``""`` when nothing usable remains
    (e.g. a name composed entirely of non-Latin characters), so callers can ask
    for an explicit slug.
    """
    slug = text.strip().lower()
    slug = _NON_ALNUM.sub("-", slug)
    slug = _MULTI_HYPHEN.sub("-", slug).strip("-")
    return slug


MAX_SLUG_SUFFIX_TRIES = 50


async def find_available_slug(base_slug: str, *, is_taken, suffix_start: int = 2) -> str:
    """Return ``base_slug`` or the first free ``base_slug-N`` for it.

    ``is_taken`` is an async predicate taking a candidate slug. The search is
    deterministic, so identical names always resolve to the same slugs.
    """
    if not await is_taken(base_slug):
        return base_slug
    for number in range(suffix_start, suffix_start + MAX_SLUG_SUFFIX_TRIES):
        candidate = f"{base_slug}-{number}"
        if not await is_taken(candidate):
            return candidate
    raise ValueError(f"could not find an available slug for '{base_slug}'")
