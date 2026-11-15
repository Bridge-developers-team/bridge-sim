"""Courses come from the checked catalog, fit the budget and the hours; pay
figures come from official tables only, for the right place."""

from urllib.parse import urlparse

from bridge.domain.learning import COURSES, FIELDS, GENERAL, match_field, month_modules, spread, study_plan
from bridge.domain.pay import pay_for, us_state


def test_every_catalog_link_is_a_specific_https_page_never_a_search():
    for course in COURSES.values():
        url = urlparse(course.url)
        assert url.scheme == "https" and url.netloc, course.id
        assert "search" not in url.path and "results" not in url.path, course.id
        if "youtube.com" in url.netloc:
            assert url.path == "/playlist", course.id  # whole university courses only


def test_every_field_lists_real_courses_and_at_least_one_free_one():
    for field in (*FIELDS, GENERAL):
        assert field.courses and all(c in COURSES for c in field.courses), field.id
        assert any(COURSES[c].cost != "paid" for c in field.courses), field.id


def test_role_titles_map_to_the_right_field_and_unknown_ones_to_general():
    assert match_field("Clinical Informatics Analyst").id == "health-data"
    assert match_field("Senior UX Researcher").id == "ux"
    assert match_field("Product Designer").id == "ux"
    assert match_field("Instructional Designer").id == "learning"
    assert match_field("Customer Success Manager").id == "sales"
    assert match_field("Care coordinator").id == "general"
    assert match_field("Build engineer").id != "ux"  # "ui" must be a whole word


def test_without_a_budget_only_free_courses_are_offered():
    plan = study_plan("Data analyst", budget_usd=0, hours_per_week=5)
    with_budget = study_plan("Data analyst", budget_usd=60, hours_per_week=5)

    assert plan.main.cost != "paid" and all(c.cost != "paid" for c in plan.more)
    assert with_budget.main.id == "google-data-analytics"


def test_the_main_course_is_spread_over_the_month_at_a_realistic_pace():
    lectures = COURSES["cs50-sql"]  # weekly series: one module a week
    certificate = COURSES["google-data-analytics"]  # each module takes weeks

    assert month_modules(lectures, 3) == 4
    assert month_modules(certificate, 5) == 1 and month_modules(certificate, 10) == 2
    assert spread(["A", "B"]) == [["A"], ["A"], ["B"], ["B"]]
    plan = study_plan("Data analyst", budget_usd=60, hours_per_week=10)
    assert [w.modules for w in plan.weeks][2] == [certificate.modules[1]]
    assert plan.later == certificate.modules[2:]


def test_us_pay_uses_the_state_median_and_falls_back_to_national():
    texas = pay_for("Data analyst", "us", "Austin, TX")
    remote = pay_for("Data analyst", "us", "Remote")

    assert us_state("Austin, TX") == "TX" and us_state("London") is None
    assert texas and texas.area == "Texas" and texas.period == "year" and texas.stat == "median"
    assert remote and remote.area == "United States" and remote.url.endswith("oes152051.htm")


def test_kazakhstan_pay_is_a_monthly_range_across_industries_and_other_countries_get_none():
    kz = pay_for("Software developer", "kz", "Almaty")

    assert kz and kz.currency == "KZT" and kz.period == "month" and kz.low < kz.high
    assert pay_for("Software developer", "de") is None
    assert pay_for("Product manager", "us") is None  # no official US occupation


def test_web_picks_keep_only_real_results_and_respect_a_zero_budget():
    from bridge.domain.drafts import CoursePickDraft, PayEstimateDraft
    from bridge.domain.learning import pick_courses
    from bridge.domain.pay import estimate_from_draft
    from bridge.domain.web import Found, harvest

    found = harvest(
        [
            Found("https://www.coursera.org/learn/hr", "HR basics"),
            Found("https://www.youtube.com/results?search_query=hr", "A search page"),
            Found("https://ocw.mit.edu/courses/hr/", "MIT HR"),
        ]
    )
    picks = [CoursePickDraft(index=9, free=True, why="made up"), CoursePickDraft(index=0, free=False, why="paid")]
    picks.append(CoursePickDraft(index=1, free=True, why="free"))

    assert [f.title for f in found] == ["HR basics", "MIT HR"]  # search pages never count
    assert [c.title for c in pick_courses(found, picks, budget_usd=0)] == ["MIT HR"]
    assert len(pick_courses(found, picks, budget_usd=100)) == 2
    draft = PayEstimateDraft(found=True, source=1, low=500000, high=300000, currency="kzt", period="monthly", note="x")
    pay = estimate_from_draft("HR generalist", "Almaty, Kazakhstan", draft, found)
    assert pay and pay.low == 300000 and pay.currency == "KZT" and pay.period == "month" and pay.url == found[1].url
    assert estimate_from_draft("HR", "Almaty", draft.model_copy(update={"source": 7}), found) is None
