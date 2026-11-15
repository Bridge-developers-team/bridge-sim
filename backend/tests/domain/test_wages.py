"""Pay from web pages: every number must be in the page's own words, and the
answer is the median of the pages, in one currency and one period."""

from bridge.domain.wages import Figure, Snippet, check, median_pay, numbers_in, per_period, target_period

RATES = {"USD": 1.0, "RUB": 90.0, "EUR": 0.92}


def page(i: int, text: str) -> Snippet:
    return Snippet(url=f"https://site{i}.example/pay", title=f"Site {i}", text=text)


def test_amounts_are_read_the_way_pages_write_them():
    assert numbers_in("$85K a year") == [85_000]
    assert numbers_in("от 150 000 ₽ до 220 000 ₽") == [150_000, 220_000]
    assert numbers_in("1,2 млн тенге") == [1_200_000]
    assert numbers_in("salary 72,500 USD") == [72_500]
    assert numbers_in("€3.200 per month") == [3_200]


def test_a_figure_counts_only_if_its_numbers_are_on_its_page():
    pages = [page(0, "Average salary: 150 000 – 220 000 ₽ per month")]
    ok = check(Figure(0, 150_000, 220_000, "RUB", "month"), pages)
    invented = check(Figure(0, 180_000, 250_000, "RUB", "month"), pages)  # not written on the page
    wrong_page = check(Figure(3, 150_000, 220_000, "RUB", "month"), pages)
    absurd = check(Figure(0, 150_000, 9_000_000, "RUB", "month"), pages)

    assert ok is not None and ok.figure.low == 150_000
    assert invented is None and wrong_page is None and absurd is None


def test_the_median_of_several_pages_in_the_countrys_currency_and_period():
    pages = [
        page(0, "150 000 ₽ in month"),
        page(1, "from 200 000 to 240 000 rubles"),
        page(2, "$30,000 a year"),  # converted: 30000/12*90 = 225000 RUB a month
        page(3, "a typo: 2 000 000 ₽ a month"),  # 9x the rest: dropped as an outlier
    ]
    figures = [
        Figure(0, 150_000, 150_000, "RUB", "month"),
        Figure(1, 200_000, 240_000, "RUB", "month"),
        Figure(2, 30_000, 30_000, "USD", "year"),
        Figure(3, 2_000_000, 2_000_000, "RUB", "month"),
    ]
    checked = [c for f in figures if (c := check(f, pages))]

    median = median_pay(checked, currency="RUB", period=target_period("ru"), rates=RATES)

    assert median is not None
    assert median.period == "month" and median.currency == "RUB"
    assert median.value == 220_000  # median of 150000, 220000, 225000
    assert [s.url for s in median.sources] == [pages[0].url, pages[1].url, pages[2].url]


def test_one_page_counts_once_and_unknown_currencies_are_left_out():
    pages = [page(0, "50,000 and 60,000 a year"), page(1, "70 000 XYZ a year")]
    checked = [
        c
        for f in [
            Figure(0, 50_000, 50_000, "USD", "year"),
            Figure(0, 60_000, 60_000, "USD", "year"),
            Figure(1, 70_000, 70_000, "XYZ", "year"),
        ]
        if (c := check(f, pages))
    ]
    median = median_pay(checked, currency="USD", period="year", rates=RATES)
    assert median is not None and median.value == 50_000 and len(median.sources) == 1
    assert median_pay([], currency="USD", period="year", rates=RATES) is None


def test_periods_convert_through_the_month():
    assert per_period(20, "hour", "month") == 20 * 173
    assert per_period(120_000, "year", "month") == 10_000
    assert per_period(10_000, "month", "year") == 120_000
    assert target_period("us") == "year" and target_period("kz") == "month"
