"""Roadmap rules: the weekly time cap, the 10-minute quick start, stable ids."""

import pytest

from bridge.domain.roadmap import (
    QUICK_TASK_MAX_MIN,
    IncompleteRoadmap,
    build_roadmap,
    check_roadmap,
    clamp_hours,
)
from bridge.domain.text import slug
from tests.factories import career, roadmap_draft, task, week


def build(draft=None, hours: float = 5):
    return build_roadmap(
        draft or roadmap_draft(),
        roadmap_id="r1",
        career=career(),
        current_role="Teacher",
        track="balanced",
        hours_per_week=hours,
        created_at="2026-11-15T00:00:00Z",
    )


def test_weekly_minutes_never_exceed_the_users_hours_and_drops_are_reported():
    heavy = [week(task("A", 200), task("B", 200), task("C", 200)) for _ in range(4)]
    roadmap = build(roadmap_draft(heavy), hours=5)

    for w in roadmap.weeks:
        assert sum(t.estimated_minutes for t in w.tasks) <= 300
    assert any("left out" in c for c in roadmap.cautions)
    assert check_roadmap(roadmap) == []


def test_week_one_always_starts_with_an_in_app_task_of_ten_minutes_or_less():
    roadmap = build()
    first = roadmap.weeks[0].tasks[0]

    assert first.type == "simulation"
    assert first.estimated_minutes <= QUICK_TASK_MAX_MIN


def test_an_ai_simulation_in_week_one_is_moved_first_and_timeboxed():
    weeks = [week(task("Read posts", 30), task("Rewrite one objective", 25, "simulation"))] + [
        week(task("X", 30)) for _ in range(3)
    ]
    first = build(roadmap_draft(weeks)).weeks[0].tasks[0]

    assert first.title == "Rewrite one objective"
    assert first.estimated_minutes == QUICK_TASK_MAX_MIN


def test_a_week_whose_only_task_is_too_long_is_shortened_not_emptied():
    weeks = [week(task("Q", 10, "simulation"))] + [week(task("Huge", 500)) for _ in range(3)]
    roadmap = build(roadmap_draft(weeks), hours=2)

    assert roadmap.weeks[1].tasks[0].estimated_minutes == 120
    assert any("shortened" in c for c in roadmap.cautions)


def test_tasks_without_deliverable_or_success_criterion_are_dropped():
    weeks = [week(task("Keep"), task("No deliverable", deliverable=""), task("No test", success=""))] + [
        week(task("X")) for _ in range(3)
    ]
    titles = [t.title for t in build(roadmap_draft(weeks)).weeks[0].tasks]

    assert "Keep" in titles
    assert "No deliverable" not in titles
    assert "No test" not in titles


def test_fewer_than_four_weeks_or_an_empty_week_is_rejected():
    with pytest.raises(IncompleteRoadmap):
        build(roadmap_draft([week(task()) for _ in range(3)]))
    with pytest.raises(IncompleteRoadmap):
        build(roadmap_draft([week(task())] + [week(task(deliverable="")) for _ in range(3)]))


def test_task_ids_are_unique_and_stable_across_rebuilds():
    weeks = [week(task("Same title"), task("Same title")) for _ in range(4)]
    a, b = build(roadmap_draft(weeks)), build(roadmap_draft(weeks))
    ids = [t.id for w in a.weeks for t in w.tasks]

    assert len(ids) == len(set(ids))
    assert ids == [t.id for w in b.weeks for t in w.tasks]
    assert {"w1-same-title", "w1-same-title-2"} <= set(ids)


def test_camel_case_on_the_wire():
    data = build().model_dump(mode="json")

    assert "hoursPerWeek" in data
    assert "estimatedMinutes" in data["weeks"][0]["tasks"][0]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(5, 5), ("7.3", 7.5), (0, 1), (99, 40), ("abc", 5), (None, 5), (float("nan"), 5)],
)
def test_clamp_hours(raw, expected):
    assert clamp_hours(raw) == expected


def test_slug_is_url_safe_and_never_empty():
    assert slug("Senior Designer (UX) – Café") == "senior-designer-ux-cafe"
    assert slug("!!!") == "item"
    assert len(slug("x" * 100)) <= 48
