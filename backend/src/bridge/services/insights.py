"""Facts from outside the app, cached: typical pay (official tables first,
then a web-found estimate), courses found on the web for one exact role,
exchange rates for the learning budget, and city lists per country."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from functools import cache
from pathlib import Path
from typing import Any, cast

import httpx

from bridge.domain.learning import COURSE_DOMAINS, Course, pick_courses
from bridge.domain.pay import Pay, estimate_from_draft, pay_for
from bridge.domain.text import clean
from bridge.llm.base import LlmError, Writer

log = logging.getLogger(__name__)

DAY = 24 * 3600
FX_URL = "https://open.er-api.com/v6/latest/USD"
# Used only when the rates service is unreachable: rough units per US dollar.
FALLBACK_RATES = {
    "USD": 1.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "KZT": 500.0,
    "RUB": 90.0,
    "CAD": 1.37,
    "AUD": 1.52,
    "INR": 84.0,
}


class _Ttl:
    def __init__(self, seconds: float) -> None:
        self.seconds = seconds
        self.items: dict[object, tuple[float, object]] = {}

    def get(self, key: object) -> tuple[bool, object]:
        hit = self.items.get(key)
        if hit and time.monotonic() - hit[0] < self.seconds:
            return True, hit[1]
        return False, None

    def put(self, key: object, value: object) -> None:
        if len(self.items) > 2000:
            self.items.clear()
        self.items[key] = (time.monotonic(), value)


class InsightsService:
    def __init__(self) -> None:
        self._pay = _Ttl(7 * DAY)
        self._courses = _Ttl(7 * DAY)
        self._rates: tuple[float, dict[str, float]] | None = None

    # ---------- exchange rates ----------

    async def rates(self) -> dict[str, float]:
        if self._rates and time.monotonic() - self._rates[0] < DAY:
            return self._rates[1]
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                data = (await client.get(FX_URL)).json()
            rates = {k.upper(): float(v) for k, v in (data.get("rates") or {}).items() if float(v) > 0}
            if rates:
                self._rates = (time.monotonic(), rates)
                return rates
        except (httpx.HTTPError, ValueError, TypeError) as err:
            log.warning("Exchange rates unavailable: %s", err)
        return FALLBACK_RATES

    async def to_usd(self, amount: float, currency: str) -> int:
        if amount <= 0:
            return 0
        code = clean(currency, 3).upper() or "USD"
        if code == "USD":
            return round(amount)
        rate = (await self.rates()).get(code)
        return round(amount / rate) if rate else round(amount)

    # ---------- pay ----------

    async def pay(self, writer: Writer | None, role: str, country: str, country_name: str, city: str) -> Pay | None:
        official = pay_for(role, country, city)
        if official or writer is None:
            return official
        place = ", ".join(p for p in (clean(city, 80), clean(country_name, 80)) if p) or country.upper()
        key = (role.strip().lower(), country, clean(city, 80).lower())
        hit, value = self._pay.get(key)
        if hit:
            return cast("Any", value)
        try:
            found, draft = await writer.pay_search(role=role, place=place)
        except LlmError as err:
            log.warning("Pay search failed for %s in %s: %s", role, place, err.message)
            return None
        estimate = estimate_from_draft(role, place, draft, found) if draft else None
        if estimate is None and city and country_name:
            # Nothing for the city: the country-wide figure is still useful.
            return await self.pay(writer, role, country, country_name, "")
        self._pay.put(key, estimate)
        return estimate

    async def pay_many(
        self, writer: Writer | None, roles: list[str], country: str, country_name: str, city: str
    ) -> list[Pay | None]:
        return list(await asyncio.gather(*(self.pay(writer, r, country, country_name, city) for r in roles)))

    # ---------- courses for one exact role ----------

    async def courses(self, writer: Writer, role: str, budget_usd: int) -> list[Course]:
        tier = "none" if budget_usd <= 0 else ("small" if budget_usd < 49 else "full")
        key = (role.strip().lower(), tier)
        hit, value = self._courses.get(key)
        if hit:
            return cast("Any", value)
        budget = (
            "none: free material only"
            if budget_usd <= 0
            else f"about {budget_usd} US dollars a month: free material plus paid courses that fit"
        )
        found, picks = await writer.course_search(role=role, budget=budget, domains=COURSE_DOMAINS)
        courses = pick_courses(found, picks, budget_usd)
        if courses:
            self._courses.put(key, courses)
        return courses


# ---------- cities per country (GeoNames, 15,000+ people, largest first) ----------

_CITIES = Path(__file__).parent / "data" / "cities.json"


@cache
def _all_cities() -> dict[str, list[str]]:
    return json.loads(_CITIES.read_text(encoding="utf-8"))


def cities(country: str, query: str = "", limit: int = 60) -> list[str]:
    names = _all_cities().get(clean(country, 2).lower(), [])
    q = clean(query, 60).lower()
    if not q:
        return names[:limit]
    starts = [n for n in names if n.lower().startswith(q)]
    within = [n for n in names if q in n.lower() and n not in starts]
    return (starts + within)[:limit]
