"""Job titles for the role pickers: the common career-change roles first,
then thousands of real titles (O*NET reported titles, CC BY 4.0), all
reference data from the database."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from bridge.domain import reference
from bridge.domain.text import clean


@lru_cache(maxsize=4)
def _ordered(first: tuple[str, ...], second: tuple[str, ...], rest: tuple[str, ...]) -> tuple[str, ...]:
    seen: set[str] = set()
    out: list[str] = []
    for t in (*first, *second, *rest):
        key = t.lower()
        if key not in seen:
            seen.add(key)
            out.append(t)
    return tuple(out)


def search_job_titles(query: str, *, first: Literal["current", "target"] = "current", limit: int = 80) -> list[str]:
    """Best matches first: titles that start with the query, then titles with
    a word that starts with it, then titles that contain it. With no query,
    the suggested roles for that picker."""
    lists = reference.get().lists
    current, target = tuple(lists.get("currentRoles", [])), tuple(lists.get("targetRoles", []))
    titles = _ordered(
        *((current, target) if first == "current" else (target, current)), tuple(lists.get("jobTitles", []))
    )
    q = clean(query, 60).lower()
    if not q:
        return list((current if first == "current" else target)[:limit])
    starts: list[str] = []
    words: list[str] = []
    within: list[str] = []
    for t in titles:
        low = t.lower()
        if low.startswith(q):
            starts.append(t)
        elif f" {q}" in low or f"-{q}" in low or f"({q}" in low:
            words.append(t)
        elif q in low:
            within.append(t)
        if len(starts) >= limit:
            break
    return (starts + words + within)[:limit]
