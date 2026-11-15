"""Courses come from the checked catalog, fit the budget and the hours; pay
figures come from official tables only, for the right place."""

from urllib.parse import urlparse

from bridge.domain.learning import COURSES, FIELDS, match_field, month_modules, spread, study_plan
from bridge.domain.pay import pay_for, us_state


def test_every_catalog_link_is_a_specific_https_page_never_a_search():
    for course in COURSES.values():
        url = urlparse(course.url)
        assert url.scheme == "https" and url.netloc, course.id
        assert "search" not in url.path and "results" not in url.path, course.id
        if "youtube.com" in url.netloc:
            assert url.path == "/playlist", course.id  # whole university courses only


def test_every_field_lists_real_courses_and_at_least_one_free_one():
    for field in FIELDS:
        assert field.courses and all(c in COURSES for c in field.courses), field.id
        assert any(COURSES[c].cost != "paid" for c in field.courses), field.id


def test_the_ai_field_list_matches_the_catalog():
    from typing import get_args

    from bridge.domain.learning import FieldId

    assert set(get_args(FieldId)) == {f.id for f in FIELDS} | {"other"}


def test_a_role_outside_the_catalog_never_gets_a_course_from_another_field():
    # The reported bug: a music teacher was sent to Harvard's CS50.
    for role, field in [("Music Teacher", ""), ("Music Teacher", "other"), ("Pastry Chef", ""), ("Paramedic", "")]:
        free = study_plan(role, paid=False, hours_per_week=5, field_id=field)
        paid = study_plan(role, paid=True, hours_per_week=5, field_id=field)
        assert free.field == "general" and free.main is None and free.more == [], role
        assert paid.main is not None and paid.main.id == "learning-how-to-learn" and not paid.more, role
        assert all("cs50" not in c.id for c in [*filter(None, [paid.main]), *paid.more])


def test_the_ai_field_beats_title_keywords_and_keywords_skip_false_friends():
    assert study_plan("Machine Learning Engineer", paid=False, hours_per_week=5).field == "software"
    assert study_plan("Learning Consultant", paid=False, hours_per_week=5, field_id="hr").field == "hr"
    assert study_plan("Data Analyst", paid=False, hours_per_week=5, field_id="nonsense").field == "data"
    for role in ["Personal Trainer", "Security Guard", "Video Editor", "Music Educator", "Yoga Instructor"]:
        assert match_field(role).id == "general", role
    assert match_field("Clinical Educator").id == "learning"
    assert pay_for("Machine Learning Engineer", "us").occupation != pay_for("Instructional Designer", "us").occupation


def test_role_titles_map_to_the_right_field_and_unknown_ones_to_general():
    assert match_field("Clinical Informatics Analyst").id == "health-data"
    assert match_field("Senior UX Researcher").id == "ux"
    assert match_field("Product Designer").id == "ux"
    assert match_field("Instructional Designer").id == "learning"
    assert match_field("Customer Success Manager").id == "sales"
    assert match_field("Care coordinator").id == "general"
    assert match_field("Build engineer").id != "ux"  # "ui" must be a whole word


def test_without_a_budget_only_free_courses_are_offered():
    plan = study_plan("Data analyst", paid=False, hours_per_week=5)
    with_budget = study_plan("Data analyst", paid=True, hours_per_week=5)

    assert plan.main is not None and plan.main.cost != "paid" and all(c.cost != "paid" for c in plan.more)
    assert with_budget.main.id == "google-data-analytics"


def test_the_main_course_is_spread_over_the_month_at_a_realistic_pace():
    lectures = COURSES["cs50-sql"]  # weekly series: one module a week
    certificate = COURSES["google-data-analytics"]  # each module takes weeks

    assert month_modules(lectures, 3) == 4
    assert month_modules(certificate, 5) == 1 and month_modules(certificate, 10) == 2
    assert spread(["A", "B"]) == [["A"], ["A"], ["B"], ["B"]]
    plan = study_plan("Data analyst", paid=True, hours_per_week=10)
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
