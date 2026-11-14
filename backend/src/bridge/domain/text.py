"""Text clean-up shared by every rule module. AI text and form text both pass
through here before anything else looks at it."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable

_SPACE = re.compile(r"\s+")


def clean(value: object, max_len: int) -> str:
    """One line of text: whitespace collapsed, trimmed, cut to `max_len`.
    Anything that is not a string becomes ""."""
    if not isinstance(value, str):
        return ""
    return _SPACE.sub(" ", value).strip()[:max_len].strip()


def clean_list(values: Iterable[object] | None, max_items: int, max_len: int = 300) -> list[str]:
    """Cleaned, non-empty items, at most `max_items` of them."""
    out = [clean(v, max_len) for v in (values or [])]
    return [v for v in out if v][:max_items]


def slug(text: str) -> str:
    """URL- and id-safe form of a title: "Senior Designer (UX)" -> "senior-designer-ux".
    Stable for the same title, so ids built from it survive a regenerated plan."""
    s = unicodedata.normalize("NFKD", str(text or "")).lower()
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"[^a-z0-9\s-]", " ", s).strip()
    s = re.sub(r"[\s-]+", "-", s)[:48].rstrip("-")
    return s or "item"
