"""The pay service: official tables first, then the median of web pages
(city, widened to the country when the city has too few), a labeled AI
estimate only when no page states a figure, and a cache so the same
question is not paid for twice."""

from __future__ import annotations

from typing import Any

from bridge.domain.drafts import PayGuessDraft
from bridge.domain.wages import Figure, Snippet
from bridge.services.insights import InsightsService


class FakeCache:
    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}

    async def get(self, key: str) -> dict[str, Any] | None:
        return self.items.get(key)

    async def put(self, key: str, payload: dict[str, Any]) -> None:
        self.items[key] = payload


class FakeWriter:
    def __init__(self, pages: dict[str, list[tuple[str, Figure | None]]], guess: PayGuessDraft | None = None):
        self.pages, self.guess, self.asked = pages, guess, []

    async def pay_research(self, *, role: str, place: str) -> tuple[list[Snippet], list[Figure]]:
        self.asked.append(place)
        found = self.pages.get(place, [])
        snippets = [
            Snippet(url=f"https://p{i}-{len(place)}.example/", title=f"P{i}", text=t) for i, (t, _) in enumerate(found)
        ]
        return snippets, [f for _, f in found if f]

    async def pay_guess(self, *, role: str, place: str) -> PayGuessDraft | None:
        self.asked.append("guess")
        return self.guess


async def no_network_rates(self: InsightsService) -> dict[str, float]:
    return {"USD": 1.0, "RUB": 90.0}


async def test_official_figure_wins_and_needs_no_ai():
    service = InsightsService(FakeCache())
    pay = await service.pay(None, "Data Analyst", "us", "United States", "Austin, TX", "data")
    assert pay is not None and pay.kind == "official" and pay.area == "Texas"


async def test_city_then_country_and_the_median_is_cached(monkeypatch):
    monkeypatch.setattr(InsightsService, "rates", no_network_rates)
    writer = FakeWriter(
        {
            "Moscow, Russia": [("Аналитик: 200 000 ₽", Figure(0, 200_000, 200_000, "RUB", "month"))],
            "Russia": [
                ("от 120 000 до 160 000 ₽", Figure(0, 120_000, 160_000, "RUB", "month")),
                ("180 000 ₽ в месяц", Figure(1, 180_000, 180_000, "RUB", "month")),
            ],
        }
    )
    cache = FakeCache()
    service = InsightsService(cache)

    pay = await service.pay(writer, "Systems Analyst", "ru", "Russia", "Moscow", "")

    # City, country and the AI's ballpark run at once; one Moscow page is too few, so the country's count too.
    assert sorted(writer.asked) == ["Moscow, Russia", "Russia", "guess"]
    assert pay is not None and pay.kind == "estimate" and pay.stat == "median"
    assert (pay.low, pay.currency, pay.period) == (180_000, "RUB", "month")  # median of 200k, 140k, 180k
    assert len(pay.sources) == 3 and pay.note == "Median of 3 sources"
    again = await service.pay(writer, "Systems Analyst", "ru", "Russia", "Moscow", "")
    assert again == pay and len(writer.asked) == 3  # from the cache: no new calls


async def test_no_page_with_a_figure_gives_a_labeled_ai_estimate_never_nothing(monkeypatch):
    monkeypatch.setattr(InsightsService, "rates", no_network_rates)
    invented = Figure(0, 999_999, 999_999, "RUB", "month")  # not on the page: rejected
    writer = FakeWriter(
        {"Russia": [("Salaries vary.", invented)]},
        guess=PayGuessDraft(low=90_000, high=150_000, currency="rub", period="month"),
    )

    pay = await InsightsService(FakeCache()).pay(writer, "Policy Analyst", "ru", "Russia", "", "")

    assert pay is not None and pay.kind == "ai" and pay.currency == "RUB" and (pay.low, pay.high) == (90_000, 150_000)
    assert "AI estimate" in pay.note and pay.url == ""


async def test_two_city_pages_are_enough_and_the_ballpark_fixes_a_yearly_figure(monkeypatch):
    monkeypatch.setattr(InsightsService, "rates", no_network_rates)
    writer = FakeWriter(
        {
            "Moscow, Russia": [
                ("Systems analyst 1 587 000", Figure(0, 1_587_000, 1_587_000, "RUB", "month")),  # yearly, mislabeled
                ("Аналитик 140 000", Figure(1, 140_000, 140_000, "RUB", "month")),
            ],
            "Russia": [("Аналитик по России 90 000", Figure(0, 90_000, 90_000, "RUB", "month"))],
        },
        guess=PayGuessDraft(low=120_000, high=180_000, currency="RUB", period="month"),
    )

    pay = await InsightsService(FakeCache()).pay(writer, "Systems Analyst", "ru", "Russia", "Moscow", "")

    assert pay is not None and pay.area == "Moscow, Russia" and len(pay.sources) == 2  # the city alone
    assert 130_000 <= pay.low <= 140_000  # 1.587M/12 = 132k and 140k: not 1.6M a month
