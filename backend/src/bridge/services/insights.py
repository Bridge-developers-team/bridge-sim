"""Facts from outside the app, cached: typical pay (official tables first,
then the median of several web sources, kept in the database), courses
found on the web for one exact role, exchange rates, and city lists."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Protocol, cast

import httpx

from bridge.domain import reference
from bridge.domain.learning import Course, course_domains, pick_courses
from bridge.domain.pay import Pay, pay_for, pay_from_guess, pay_from_median
from bridge.domain.reference import Country
from bridge.domain.text import clean
from bridge.domain.wages import Checked, Snippet, check, convert, median_pay, per_period, target_period
from bridge.llm.base import LlmError, Writer

log = logging.getLogger(__name__)

_NO_COUNTRY = Country(code="", name="", currency="")


class PayCacheLike(Protocol):
    async def get(self, key: str) -> dict[str, Any] | None: ...

    async def put(self, key: str, payload: dict[str, Any]) -> None: ...


DAY = 24 * 3600
FX_URL = "https://open.er-api.com/v6/latest/USD"


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


async def _none() -> Pay | None:
    return None


class InsightsService:
    def __init__(self, pay_cache: PayCacheLike | None = None) -> None:
        self._pay_cache = pay_cache
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
        return reference.get().usd_rates  # rough fallback rates (reference data)

    async def to_usd(self, amount: float, currency: str) -> int:
        if amount <= 0:
            return 0
        code = clean(currency, 3).upper() or "USD"
        if code == "USD":
            return round(amount)
        rate = (await self.rates()).get(code)
        return round(amount / rate) if rate else round(amount)

    # ---------- pay ----------

    async def pay(
        self, writer: Writer | None, role: str, country: str, country_name: str, city: str, field: str = ""
    ) -> Pay | None:
        """Official figure first. Else, with the live AI: the median of the
        figures several web pages state (city first, then the whole country),
        each number checked against the page's words; only when no page
        states one, the AI's own estimate, labeled as such. Kept 30 days."""
        official = pay_for(role, country, city, field)
        if official or writer is None:
            return official
        name = clean(country_name, 80) or (reference.get().country(country) or _NO_COUNTRY).name or country.upper()
        town = clean(city, 80)
        if town.lower() in {"remote", "anywhere"}:
            town = ""
        key = "|".join((clean(role, 80).lower(), country, town.lower()))
        if self._pay_cache:
            cached = await self._pay_cache.get(key)
            if cached:
                return Pay.model_validate(cached)
        estimate = await self._research(writer, role, country, name, town)
        if estimate and self._pay_cache:
            await self._pay_cache.put(key, estimate.model_dump(by_alias=True))
        return estimate

    async def _research(self, writer: Writer, role: str, country: str, name: str, town: str) -> Pay | None:
        """City and country searches and the AI's ballpark run at the same
        time (each is slow; one after the other took about 30 seconds). The
        city's pages are used alone when there are at least two of them."""
        places = [f"{town}, {name}", name] if town else [name]

        async def research(place: str) -> tuple[list[Snippet], list[Checked]]:
            try:
                snippets, figures = await writer.pay_research(role=role, place=place)
            except LlmError as err:
                log.warning("Pay research failed for %s in %s: %s", role, place, err.message)
                return [], []
            checked = [c for f in figures if (c := check(f, snippets)) is not None]
            log.info(
                "Pay %r in %s: %d pages cited, %d figures read, %d kept after checks",
                role, place, len(snippets), len(figures), len(checked),
            )  # fmt: skip
            return snippets, checked

        found, guess, rates = await asyncio.gather(
            asyncio.gather(*(research(p) for p in places)),
            writer.pay_guess(role=role, place=places[0]),
            self.rates(),
        )
        city_checked = found[0][1] if town else []
        if town and len({c.snippet.url for c in city_checked}) >= 2:
            checked, area = city_checked, places[0]
        else:
            checked, area = [c for _, cs in found for c in cs], name
        local = (reference.get().country(country) or _NO_COUNTRY).currency
        currency = local or (checked[0].figure.currency if checked else "USD")
        period = target_period(country)
        anchor = None
        if guess:
            mid = (guess.low + guess.high) / 2
            anchor = convert(per_period(mid, guess.period, period), clean(guess.currency, 3).upper(), currency, rates)
        median = median_pay(checked, currency=currency, period=period, rates=rates, anchor=anchor)
        if median:
            return pay_from_median(role, area, median)
        return pay_from_guess(role, places[0], guess) if guess else None

    async def pay_many(
        self, writer: Writer | None, roles: list[str], fields: list[str], country: str, country_name: str, city: str
    ) -> list[Pay | None]:
        jobs = [
            self.pay(writer, r, country, country_name, city, fields[i] if i < len(fields) else "") if r else _none()
            for i, r in enumerate(roles)
        ]
        return list(await asyncio.gather(*jobs))

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
        found, picks = await writer.course_search(role=role, budget=budget, domains=course_domains())
        courses = pick_courses(found, picks, budget_usd)
        if courses:
            self._courses.put(key, courses)
        return courses


# ---------- cities per country (reference data: GeoNames, largest first) ----------


def cities(country: str, query: str = "", limit: int = 60) -> list[str]:
    names = reference.get().cities.get(clean(country, 2).lower(), [])
    q = clean(query, 60).lower()
    if not q:
        return names[:limit]
    starts = [n for n in names if n.lower().startswith(q)]
    within = [n for n in names if q in n.lower() and n not in starts]
    return (starts + within)[:limit]
