"""Use case: job openings for a role near the user.

Live listings come from Adzuna when the server has keys and the country is
covered; the job-board links are always returned, so the panel is never empty.
Results are cached for an hour per (role, city, country): openings do not
change by the minute, and the free API quota is small."""

from __future__ import annotations

import logging
import time
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from bridge.domain.jobs import (
    ADZUNA_COUNTRIES,
    JobsResult,
    board_links,
    normalize_country,
    parse_adzuna,
    people_links,
    topic_links,
)
from bridge.domain.text import clean

log = logging.getLogger(__name__)

Fetch = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]
ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/{country}/search/1"
CACHE_SECONDS = 3600


async def http_fetch(url: str, params: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=8.0) as client:
        response = await client.get(url, params=params, headers={"Accept": "application/json"})
        response.raise_for_status()
        return response.json()


class JobsService:
    def __init__(
        self,
        app_id: str | None,
        app_key: str | None,
        fetch: Fetch = http_fetch,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._app_id, self._app_key = app_id, app_key
        self._fetch, self._clock = fetch, clock
        self._cache: dict[tuple[str, str, str, str], tuple[float, JobsResult]] = {}

    @property
    def live(self) -> bool:
        return bool(self._app_id and self._app_key)

    async def find(self, *, role: str, city: str, country: str, field: str = "") -> JobsResult:
        role, city, country, field = clean(role, 80), clean(city, 80), normalize_country(country), clean(field, 40)
        key = (role.lower(), city.lower(), country, field)
        cached = self._cache.get(key)
        if cached and self._clock() - cached[0] < CACHE_SECONDS:
            return cached[1]

        listings = []
        if self.live and country in ADZUNA_COUNTRIES:
            params = {
                "app_id": self._app_id,
                "app_key": self._app_key,
                "what": role,
                "results_per_page": 10,
                "sort_by": "date",
                "max_days_old": 30,
            }
            if city and city.lower() not in {"remote", "anywhere"}:
                params["where"] = city
            try:
                listings = parse_adzuna(await self._fetch(ADZUNA_URL.format(country=country), params))
            except Exception as err:  # any failure: fall back to the job-board links
                log.warning("Adzuna lookup failed for %r in %r/%s: %s", role, city, country, err)
        result = JobsResult(
            role=role,
            city=city,
            country=country,
            source="adzuna" if listings else "links",
            listings=listings,
            links=board_links(role, city, country),
            people=people_links(role, city, country, field),
            topics=topic_links(role),
        )
        self._cache[key] = (self._clock(), result)
        if len(self._cache) > 500:  # keep memory flat
            oldest = min(self._cache, key=lambda k: self._cache[k][0])
            del self._cache[oldest]
        return result
