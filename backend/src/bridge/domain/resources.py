"""Learning resources for a roadmap week. Real links only: the AI searches the
web, but every URL shown comes from the search engine's own results, and the
AI may only pick among them by number. A link it typed itself can never reach
the user (the same idea as the CV quote check)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal
from urllib.parse import quote_plus, urlparse

from bridge.domain.models import CamelModel
from bridge.domain.text import clean

Kind = Literal["article", "video", "search"]

MAX_ARTICLES = 3
MAX_VIDEOS = 2
_VIDEO_HOSTS = ("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be")


class Resource(CamelModel):
    kind: Kind
    title: str
    url: str
    source: str  # domain shown to the user, e.g. "youtube.com"
    why: str = ""


@dataclass(frozen=True)
class Found:
    """One search-engine result, as the web search tool returned it."""

    url: str
    title: str
    age: str = ""


def domain(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def is_video(url: str) -> bool:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if host == "youtu.be":
        return len(parsed.path) > 1
    return host in _VIDEO_HOSTS and (parsed.path == "/watch" or parsed.path.startswith("/shorts/"))


def harvest(results: list[Found]) -> list[Found]:
    """Clean search results: https only, one entry per URL, titles trimmed.
    YouTube channel and search pages are dropped; only single videos count."""
    seen: set[str] = set()
    out: list[Found] = []
    for r in results:
        url = r.url.strip()
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.netloc or url in seen:
            continue
        if domain(url).endswith("youtube.com") and not is_video(url):
            continue
        seen.add(url)
        out.append(Found(url=url, title=clean(r.title, 160) or domain(url), age=clean(r.age, 40)))
    return out


def pick(found: list[Found], choices: list[tuple[int, str]]) -> list[Resource]:
    """The AI's choices, as (index into `found`, one-line reason). Indexes that
    do not exist are ignored; at most 3 articles and 2 videos, in its order."""
    articles: list[Resource] = []
    videos: list[Resource] = []
    used: set[int] = set()
    for index, why in choices:
        if index in used or not 0 <= index < len(found):
            continue
        used.add(index)
        r = found[index]
        video = is_video(r.url)
        bucket, cap = (videos, MAX_VIDEOS) if video else (articles, MAX_ARTICLES)
        if len(bucket) < cap:
            bucket.append(
                Resource(
                    kind="video" if video else "article",
                    title=r.title,
                    url=r.url,
                    source=domain(r.url),
                    why=clean(why, 160),
                )
            )
    return articles + videos


def search_links(topic: str) -> list[Resource]:
    """No AI available (demo mode): honest search links instead of picked pages."""
    q = quote_plus(clean(topic, 120))
    return [
        Resource(
            kind="search",
            title=f"YouTube: {clean(topic, 120)}",
            url=f"https://www.youtube.com/results?search_query={q}",
            source="youtube.com",
        ),
        Resource(
            kind="search",
            title=f"Articles: {clean(topic, 120)}",
            url=f"https://www.google.com/search?q={q}",
            source="google.com",
        ),
    ]
