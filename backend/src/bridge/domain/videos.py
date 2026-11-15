"""YouTube videos for learning a path's missing skills. Real videos only: every
entry comes from the YouTube Data API, never from the AI. The AI (or the demo
data) only writes the search phrases; the rules here decide what is good
enough to show:

- English: the video's own language tags say English, or, when it has none,
  its title is written in the Latin alphabet;
- watched: enough views that other learners found it useful. The bar starts
  high and steps down only when nothing clears it, and never goes below a
  floor, so a search can come back empty rather than show an unwatched video;
- a real lesson: 3 to 90 minutes, not live or upcoming;
- one video per search phrase, never the same video twice.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from bridge.domain.models import CamelModel
from bridge.domain.text import clean

# Views a video needs, tried in order: the first bar any candidate clears wins.
VIEW_BARS = (50_000, 10_000, 2_000)
MIN_SECONDS = 3 * 60
MAX_SECONDS = 90 * 60
MAX_QUERIES = 3

_DURATION = re.compile(r"^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$")
_VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{6,20}$")


class Video(CamelModel):
    id: str
    title: str
    channel: str
    url: str
    thumbnail: str
    views: int
    minutes: int
    published: str  # ISO date
    query: str  # the search phrase it answers


class VideosResult(CamelModel):
    source: str  # "youtube", or "off" when the server has no YouTube key
    videos: list[Video]


@dataclass(frozen=True)
class Candidate:
    """One YouTube video as the API describes it (search order kept)."""

    id: str
    title: str
    channel: str
    thumbnail: str
    views: int
    seconds: int
    published: str
    language: str  # defaultAudioLanguage, else defaultLanguage, else ""
    live: bool


def duration_seconds(iso: str) -> int:
    """ISO 8601 duration ("PT15M33S", "PT1H2M", "P1DT2H") -> seconds; 0 if unreadable."""
    m = _DURATION.match(iso or "")
    if not m or not any(m.groups()):
        return 0
    d, h, mi, s = (int(g) if g else 0 for g in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + s


def _latin_title(title: str) -> bool:
    letters = [ch for ch in title if ch.isalpha()]
    return bool(letters) and sum(ch.isascii() for ch in letters) / len(letters) >= 0.9


def is_english(c: Candidate) -> bool:
    if c.language:
        return c.language.lower().startswith("en")
    return _latin_title(c.title)


def is_lesson(c: Candidate) -> bool:
    return not c.live and MIN_SECONDS <= c.seconds <= MAX_SECONDS


def best(candidates: list[Candidate], taken: set[str]) -> Candidate | None:
    """The most relevant usable video (YouTube's order is relevance) that
    clears the highest view bar any of them clears; None if none clears the
    lowest bar."""
    usable = [c for c in candidates if c.id not in taken and is_english(c) and is_lesson(c)]
    for bar in VIEW_BARS:
        for c in usable:
            if c.views >= bar:
                return c
    return None


def to_video(c: Candidate, query: str) -> Video:
    return Video(
        id=c.id,
        title=c.title,
        channel=c.channel,
        url=f"https://www.youtube.com/watch?v={c.id}",
        thumbnail=c.thumbnail,
        views=c.views,
        minutes=max(1, round(c.seconds / 60)),
        published=c.published[:10],
        query=query,
    )


def parse_videos(payload: dict) -> list[Candidate]:
    """A videos.list response (part=snippet,statistics,contentDetails) ->
    candidates. Entries missing an id, a title or a view count are skipped."""
    out: list[Candidate] = []
    for item in payload.get("items") or []:
        if not isinstance(item, dict):
            continue
        vid = str(item.get("id") or "")
        snippet = item.get("snippet") or {}
        stats = item.get("statistics") or {}
        details = item.get("contentDetails") or {}
        title = clean(snippet.get("title"), 160)
        try:
            views = int(str(stats.get("viewCount")))
        except ValueError:
            continue
        if not _VIDEO_ID.match(vid) or not title:
            continue
        thumbs = snippet.get("thumbnails") or {}
        thumb = next((thumbs[k].get("url", "") for k in ("medium", "high", "default") if k in thumbs), "")
        out.append(
            Candidate(
                id=vid,
                title=title,
                channel=clean(snippet.get("channelTitle"), 100),
                thumbnail=thumb if str(thumb).startswith("https://") else "",
                views=views,
                seconds=duration_seconds(str(details.get("duration") or "")),
                published=clean(snippet.get("publishedAt"), 25),
                language=clean(snippet.get("defaultAudioLanguage") or snippet.get("defaultLanguage"), 12),
                live=snippet.get("liveBroadcastContent") in {"live", "upcoming"},
            )
        )
    return out


def search_ids(payload: dict) -> list[str]:
    """A search.list response -> video ids, in YouTube's relevance order."""
    ids: list[str] = []
    for item in payload.get("items") or []:
        vid = str(((item or {}).get("id") or {}).get("videoId") or "")
        if _VIDEO_ID.match(vid) and vid not in ids:
            ids.append(vid)
    return ids


def queries(raw: list[str], role: str) -> list[str]:
    """Clean, distinct search phrases (at most 3). When none is given, one
    phrase that always has good English videos: what the role is like."""
    out: list[str] = []
    for q in raw:
        q = clean(q, 80)
        if q and q.lower() not in {o.lower() for o in out}:
            out.append(q)
    if not out and clean(role, 80):
        out.append(fallback_query(role))
    return out[:MAX_QUERIES]


def fallback_query(role: str) -> str:
    """Asked when a phrase finds nothing good: broad and always well covered."""
    role = clean(role, 80).lower()
    return f"what does {'an' if role[:1] in 'aeiou' else 'a'} {role} do"
