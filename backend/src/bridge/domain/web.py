"""Web search results as the AI saw them. A URL can reach the user only if the
search engine returned it: the AI picks results by number and never types a
link itself (the same idea as the CV quote check)."""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

from bridge.domain.text import clean


@dataclass(frozen=True)
class Found:
    """One search-engine result, as the web search tool returned it."""

    url: str
    title: str
    age: str = ""


def host(url: str) -> str:
    h = urlparse(url).netloc.lower()
    return h[4:] if h.startswith("www.") else h


def is_search_page(url: str) -> bool:
    """Search and listing pages are never shown: only specific pages."""
    p = urlparse(url)
    h, path = host(url), p.path.lower()
    if h.endswith("youtube.com"):
        return not (path == "/watch" or path == "/playlist")
    return "/search" in path or path.endswith("/results") or (h.endswith("google.com") and path in ("", "/"))


def harvest(results: list[Found], limit: int = 20) -> list[Found]:
    """https only, one entry per URL, no search pages, titles trimmed."""
    seen: set[str] = set()
    out: list[Found] = []
    for r in results:
        url = r.url.strip()
        p = urlparse(url)
        if p.scheme != "https" or not p.netloc or url in seen or is_search_page(url):
            continue
        seen.add(url)
        out.append(Found(url=url, title=clean(r.title, 160) or host(url), age=clean(r.age, 40)))
        if len(out) == limit:
            break
    return out


def numbered(found: list[Found]) -> str:
    """The list the AI picks from: '[3] Title (host, age)'."""
    return "\n".join(f"[{i}] {r.title} ({host(r.url)}{', ' + r.age if r.age else ''})" for i, r in enumerate(found))
