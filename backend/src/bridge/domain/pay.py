"""Typical pay for a target role where the user lives, from official
statistics only. Nothing here is estimated by us or by the AI: every number
is copied from a public table, and the UI shows its source, year and the
official occupation name it belongs to (often the closest match, not an
exact one).

- United States: BLS Occupational Employment and Wage Statistics (OEWS),
  May 2025, annual median wage, national and for the states of the cities
  in the start form.
- Kazakhstan: Bureau of National Statistics, "Distribution of wages of
  workers by main professions and positions" (2026, published 03.11.2026),
  average monthly nominal wage. The survey gives a figure per industry, so
  the UI shows the range across the industries most career changers join.
Everywhere else (and for jobs with no official figure): the median of the
figures several web pages state, each number checked against the page's
own words (domain/wages.py), with the pages linked. Only when no page states
a figure does the card show the AI's own estimate, labeled as such."""

from __future__ import annotations

import re
from typing import Literal

from pydantic import Field as PydanticField

from bridge.domain import reference
from bridge.domain.drafts import PayGuessDraft
from bridge.domain.learning import match_field
from bridge.domain.models import CamelModel
from bridge.domain.text import clean
from bridge.domain.wages import Median
from bridge.domain.web import host

# The tables themselves (US medians by state, Kazakhstan's averages by
# industry, which official occupation each study field maps to) are reference
# data in the database: see domain/reference.py and db/seed/pay_*.json.


class PaySource(CamelModel):
    title: str
    url: str


class Pay(CamelModel):
    role: str
    occupation: str  # the official occupation the number belongs to
    area: str  # "Texas", "United States", "Kazakhstan"
    currency: str
    period: Literal["year", "month"]
    stat: Literal["median", "average", "estimate"]
    low: int
    high: int  # equal to low for a single figure
    note: str = ""  # e.g. "Range across 3 industries"
    source: str
    url: str
    # official: a statistics table; estimate: the median of web pages' figures;
    # ai: the AI's own estimate when no page stated one (labeled on the card).
    kind: Literal["official", "estimate", "ai"] = "official"
    sources: list[PaySource] = PydanticField(default_factory=list)


_STATE = re.compile(r",\s*([A-Z]{2})\b")


def us_state(location: str) -> str | None:
    """'Austin, TX' -> 'TX' when we have that state's figures."""
    m = _STATE.search(clean(location, 120))
    return m.group(1) if m and m.group(1) in reference.get().pay_us.states else None


def pay_for(role: str, country: str, location: str = "", field_id: str = "") -> Pay | None:
    """An official figure for the role's study field, or None."""
    ref = reference.get()
    field = match_field(role, field_id)
    if country == "us" and field.us_soc:
        us = ref.pay_us
        soc = field.us_soc
        medians = us.medians.get(soc, {})
        state = us_state(location)
        area, value = ("US", medians.get("US"))
        if state and medians.get(state):
            area, value = state, medians[state]
        if not value:
            return None
        return Pay(
            role=clean(role, 80),
            occupation=us.titles.get(soc, ""),
            area=us.states.get(area, "United States"),
            currency="USD",
            period="year",
            stat="median",
            low=value,
            high=value,
            note="" if area != "US" or not state else "No state figure for this job; national median.",
            source=us.source,
            url=f"https://www.bls.gov/oes/current/oes{soc.replace('-', '')}.htm",
        )
    if country == "kz" and field.kz_key in ref.pay_kz.occupations:
        kz = ref.pay_kz
        occupation, by_industry = kz.occupations[field.kz_key]
        values = sorted(by_industry.values())
        return Pay(
            role=clean(role, 80),
            occupation=occupation,
            area="Kazakhstan",
            currency="KZT",
            period="month",
            stat="average",
            low=values[0],
            high=values[-1],
            note=(
                f"Range across {len(values)} industries: {', '.join(by_industry)}."
                if len(values) > 1
                else f"In {next(iter(by_industry))}."
            ),
            source=kz.source,
            url=kz.url,
        )
    return None


def pay_from_median(role: str, area: str, median: Median) -> Pay:
    """The median of several web pages' figures, with every page linked."""
    first = median.sources[0]
    return Pay(
        role=clean(role, 80),
        occupation=clean(role, 80),
        area=clean(area, 80),
        currency=median.currency,
        period=median.period,
        stat="median",
        low=median.value,
        high=median.value,
        note=f"Median of {len(median.sources)} source{'s' if len(median.sources) != 1 else ''}",
        source=f"{first.title} ({host(first.url)})",
        url=first.url,
        kind="estimate",
        sources=[PaySource(title=f"{clean(s.title, 80) or host(s.url)}", url=s.url) for s in median.sources],
    )


def pay_from_guess(role: str, area: str, guess: PayGuessDraft) -> Pay | None:
    """Last resort when no page states a figure: the AI's own estimate, which
    the card labels as such. Sanity-checked like any other figure."""
    low, high = sorted((round(guess.low), round(guess.high)))
    currency = clean(guess.currency, 3).upper()
    if low <= 0 or high > low * 5 or not re.fullmatch(r"[A-Z]{3}", currency):
        return None
    return Pay(
        role=clean(role, 80),
        occupation=clean(role, 80),
        area=clean(area, 80),
        currency=currency,
        period=guess.period,
        stat="estimate",
        low=low,
        high=high,
        note="AI estimate: no web source stated pay for this job here",
        source="",
        url="",
        kind="ai",
    )
