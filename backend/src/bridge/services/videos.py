"""Use case: the best English YouTube videos for a path's search phrases.

Two YouTube Data API calls per new phrase set: search.list for each phrase
(relevance order, English first), then one videos.list for the views,
length and language of every candidate. The domain rules (domain/videos.py)
pick one video per phrase. A phrase with no good video is retried once with a
broad phrase about the role. Results are cached for a day: YouTube allows 100
searches a day on a free key, and good videos do not change by the hour.

Without a key the service is off and says so; nothing breaks."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable

from bridge.domain.text import clean
from bridge.domain.videos import (
    Candidate,
    VideosResult,
    best,
    fallback_query,
    parse_videos,
    queries,
    search_ids,
    to_video,
)
from bridge.services.jobs import Fetch, http_fetch

log = logging.getLogger(__name__)

API = "https://www.googleapis.com/youtube/v3"
CACHE_SECONDS = 24 * 3600
PER_SEARCH = 12


class VideosService:
    def __init__(
        self, api_key: str | None, fetch: Fetch = http_fetch, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._key, self._fetch, self._clock = api_key, fetch, clock
        self._searches: dict[str, tuple[float, list[str]]] = {}
        self._details: dict[str, tuple[float, Candidate]] = {}

    @property
    def live(self) -> bool:
        return bool(self._key)

    def _fresh[T](self, entry: tuple[float, T] | None) -> T | None:
        return entry[1] if entry and self._clock() - entry[0] < CACHE_SECONDS else None

    async def _search(self, query: str) -> list[str]:
        key = query.lower()
        cached = self._fresh(self._searches.get(key))
        if cached is not None:
            return cached
        payload = await self._fetch(
            f"{API}/search",
            {
                "key": self._key,
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": PER_SEARCH,
                "relevanceLanguage": "en",
                "safeSearch": "strict",
                "regionCode": "US",
            },
        )
        ids = search_ids(payload)
        self._searches[key] = (self._clock(), ids)
        if len(self._searches) > 1000:
            self._searches.pop(next(iter(self._searches)))
        return ids

    async def _describe(self, ids: list[str]) -> dict[str, Candidate]:
        out = {i: c for i in ids if (c := self._fresh(self._details.get(i))) is not None}
        missing = [i for i in ids if i not in out]
        for start in range(0, len(missing), 50):  # videos.list takes up to 50 ids
            payload = await self._fetch(
                f"{API}/videos",
                {
                    "key": self._key,
                    "part": "snippet,statistics,contentDetails",
                    "id": ",".join(missing[start : start + 50]),
                },
            )
            for c in parse_videos(payload):
                out[c.id] = c
                self._details[c.id] = (self._clock(), c)
        if len(self._details) > 5000:
            for old in list(self._details)[:1000]:
                del self._details[old]
        return out

    async def _pick(self, query: str, taken: set[str]) -> Candidate | None:
        ids = await self._search(query)
        described = await self._describe(ids)
        return best([described[i] for i in ids if i in described], taken)

    async def find(self, *, phrases: list[str], role: str) -> VideosResult:
        if not self.live:
            return VideosResult(source="off", videos=[])
        role = clean(role, 80)
        videos = []
        taken: set[str] = set()
        try:
            for query in queries(phrases, role):
                chosen = await self._pick(query, taken)
                asked = query
                if chosen is None and role and query != fallback_query(role):
                    asked = fallback_query(role)
                    chosen = await self._pick(asked, taken)
                if chosen is not None:
                    taken.add(chosen.id)
                    videos.append(to_video(chosen, asked))
        except Exception as err:  # quota, network, bad key: show what was found so far
            log.warning("YouTube lookup failed for %r: %s", role, err)
        return VideosResult(source="youtube", videos=videos)
