"""Pay for any job in any place, from several real web pages. The AI reads
the pages' own words (verbatim snippets the search engine cited) and copies
out each figure; code then:

- keeps a figure only if its numbers appear in that page's snippet (the same
  idea as the CV quote check: a number the AI typed itself never counts);
- turns every figure into one currency and one period (month or year);
- reports the median of the sources, one figure per page, with the pages.

Nothing here talks to the web or the AI."""

from __future__ import annotations

import re
import statistics
from dataclasses import dataclass
from typing import Literal

from bridge.domain.text import clean

Period = Literal["hour", "month", "year"]
HOURS_A_MONTH = 173  # 40 hours x 52 weeks / 12
# More than this a month (in US dollars) is a yearly figure read as monthly:
# no role Bridge suggests to a career changer pays $480,000 a year.
MAX_MONTHLY_USD = 40_000
MAX_SOURCES = 8

# Countries that quote pay by the month; the rest quote it by the year.
MONTHLY_COUNTRIES = frozenset(
    {"kz", "ru", "by", "uz", "kg", "ua", "az", "am", "ge", "tr", "br", "mx", "ar", "cl", "co", "pe", "ph", "id",
     "vn", "th", "my", "eg", "ma", "pl", "cz", "sk", "hu", "ro", "bg", "rs", "hr", "si", "lt", "lv", "ee", "pt",
     "es", "it", "gr", "fr", "de", "at", "ch", "nl", "be", "se", "no", "dk", "fi", "jp", "kr", "cn", "tw", "ae", "sa"}
)  # fmt: skip


@dataclass(frozen=True)
class Snippet:
    """One page's words, as the search engine cited them."""

    url: str
    title: str
    text: str


@dataclass(frozen=True)
class Figure:
    """One pay figure the AI copied from snippet number `source`."""

    source: int
    low: float
    high: float
    currency: str
    period: Period


@dataclass(frozen=True)
class Checked:
    """A figure that passed the checks, with its page."""

    snippet: Snippet
    figure: Figure


_NUM = re.compile(r"(\d{1,3}(?:[ ,.  ]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|K|thousand|тыс\.?|m|M|mln|million|млн\.?)?")


def numbers_in(text: str) -> list[float]:
    """Every amount written in a text, with thousands separators and "k" or
    "million" suffixes understood: "$85K" -> 85000, "150 000 ₽" -> 150000,
    "1,2 млн" -> 1200000."""
    out: list[float] = []
    for raw, suffix in _NUM.findall(text or ""):
        digits = raw.replace(" ", " ").replace(" ", " ")
        if re.fullmatch(r"\d{1,3}(?:[ ,.]\d{3})+", digits):
            value = float(re.sub(r"[ ,.]", "", digits))
        else:
            value = float(digits.replace(",", "."))
        s = (suffix or "").lower().rstrip(".")
        if s in {"k", "thousand", "тыс"}:
            value *= 1_000
        elif s in {"m", "mln", "million", "млн"}:
            value *= 1_000_000
        out.append(value)
    return out


_PERIOD_WORDS: dict[Period, re.Pattern[str]] = {
    "year": re.compile(
        r"/\s*(yr|year|annum)\b|\bper (year|annum)\b|\ba year\b|\bannual(ly)?\b|\byearly\b|\bp\.a\.|"
        r"в год|годов|за год|jährlich|pro jahr|par an\b|al año|по году",
        re.IGNORECASE,
    ),
    "month": re.compile(
        r"/\s*(mo|mth|month)\b|\bper month\b|\ba month\b|\bmonthly\b|"
        r"в месяц|ежемесяч|в мес\b|за месяц|monatlich|pro monat|par mois|al mes|айына",
        re.IGNORECASE,
    ),
    "hour": re.compile(
        r"/\s*(hr|hour|h)\b|\bper hour\b|\ban hour\b|\bhourly\b|в час|pro stunde|par heure", re.IGNORECASE
    ),
}


def period_in(text: str) -> Period | None:
    """The pay period a page's words state, when they state exactly one.
    The AI's own label is a guess: Glassdoor's "1,587,000 RUB /yr" read as a
    monthly figure is a twelve-fold error, and both pages agreed on it."""
    found = [p for p, words in _PERIOD_WORDS.items() if words.search(text or "")]
    return found[0] if len(found) == 1 else None


def _appears(value: float, numbers: list[float]) -> bool:
    return any(abs(value - n) <= max(1.0, n * 0.005) for n in numbers)


def check(figure: Figure, snippets: list[Snippet]) -> Checked | None:
    """The figure, if it is sane and both its numbers are in its page's words."""
    if not 0 <= figure.source < len(snippets):
        return None
    low, high = sorted((figure.low, figure.high))
    if low <= 0 or high > low * 10 or not re.fullmatch(r"[A-Z]{3}", figure.currency or ""):
        return None
    snippet = snippets[figure.source]
    numbers = numbers_in(snippet.text)
    if not (_appears(low, numbers) and _appears(high, numbers)):
        return None
    period = period_in(snippet.text) or figure.period  # the page's words win over the AI's label
    return Checked(snippet, Figure(figure.source, low, high, figure.currency, period))


def target_period(country: str) -> Literal["month", "year"]:
    return "month" if country in MONTHLY_COUNTRIES else "year"


def per_period(amount: float, period: Period, target: Literal["month", "year"]) -> float:
    monthly = amount * HOURS_A_MONTH if period == "hour" else amount / 12 if period == "year" else amount
    return monthly if target == "month" else monthly * 12


def convert(amount: float, currency: str, target: str, rates: dict[str, float]) -> float | None:
    """`rates` are units per US dollar. None when either rate is unknown."""
    if currency == target:
        return amount
    a, b = rates.get(currency), rates.get(target)
    return amount / a * b if a and b else None


@dataclass(frozen=True)
class Median:
    value: int
    currency: str
    period: Literal["month", "year"]
    sources: list[Snippet]  # one per figure, in the order used


def _round(value: float) -> int:
    """Pay is quoted in round numbers: to the nearest 10, 100 or 1,000."""
    step = 1_000 if value >= 100_000 else 100 if value >= 10_000 else 10
    return int(round(value / step) * step)


def median_pay(
    checked: list[Checked],
    *,
    currency: str,
    period: Literal["month", "year"],
    rates: dict[str, float],
    anchor: float | None = None,
) -> Median | None:
    """The median of one midpoint per page, in `currency` per `period`. Pages
    whose currency cannot be converted are left out; a page counts once even
    if it gave several figures.

    `anchor` (same currency and period) is the AI's own ballpark for the job.
    A page about twelve times above it states a yearly figure that was read
    as monthly, so it is divided by 12; a page still more than 5x away from
    the anchor is dropped (another job, a typo). Without an anchor, outliers
    more than 4x away from the median of the pages are dropped."""
    per_page: dict[str, tuple[Snippet, float]] = {}
    for c in checked:
        if c.snippet.url in per_page:
            continue
        mid = (c.figure.low + c.figure.high) / 2
        monthly_usd = convert(per_period(mid, c.figure.period, "month"), c.figure.currency, "USD", rates)
        figure_period = c.figure.period
        if figure_period == "month" and monthly_usd and monthly_usd > MAX_MONTHLY_USD:
            figure_period = "year"
        value = convert(per_period(mid, figure_period, period), c.figure.currency, currency, rates)
        if value and value > 0:
            per_page[c.snippet.url] = (c.snippet, value)
    pages = list(per_page.values())[:MAX_SOURCES]
    if anchor and anchor > 0:
        fixed = []
        for s, v in pages:
            if period == "month" and v > anchor * 5 and anchor / 3 <= v / 12 <= anchor * 3:
                v = v / 12  # a yearly figure read as monthly
            elif period == "year" and v < anchor / 5 and anchor / 3 <= v * 12 <= anchor * 3:
                v = v * 12  # a monthly figure read as yearly
            if anchor / 5 <= v <= anchor * 5:
                fixed.append((s, v))
        pages = fixed
    if not pages:
        return None
    middle = statistics.median(v for _, v in pages)
    kept = [(s, v) for s, v in pages if middle / 4 <= v <= middle * 4]
    return Median(
        value=_round(statistics.median(v for _, v in kept)),
        currency=currency,
        period=period,
        sources=[s for s, _ in kept],
    )


def numbered_snippets(snippets: list[Snippet]) -> str:
    """The list the AI reads figures from: '[2] title (url)\\n"words"'."""
    return "\n\n".join(f'[{i}] {clean(s.title, 120)} ({s.url})\n"{clean(s.text, 600)}"' for i, s in enumerate(snippets))
