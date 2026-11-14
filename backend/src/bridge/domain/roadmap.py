"""30-day roadmap rules. The AI proposes weeks and tasks; this module owns
everything that must hold whatever the AI wrote:
- exactly 4 weeks, 1-4 tasks each, every task with a deliverable and a
  success criterion;
- weekly minutes never above hours_per_week x 60;
- week 1 starts with an in-app practice task of 10 minutes or less;
- stable task ids, so ticks survive a reload or a regenerated plan.

Progress, next action and merging ticks run in the browser
(frontend/src/lib/progress.ts), next to the ticks themselves.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from bridge.domain.drafts import RoadmapDraft, TaskDraft
from bridge.domain.models import Career, Roadmap, Task, TaskType, Track, Week
from bridge.domain.text import clean, clean_list, slug

WEEKS = 4
MAX_TASKS_PER_WEEK = 4
QUICK_TASK_MAX_MIN = 10
MIN_HOURS = 1.0
MAX_HOURS = 40.0
DEFAULT_HOURS = 5.0


@dataclass(frozen=True)
class TrackInfo:
    label: str
    share: float  # how much of the weekly time the plan aims to use; the cap is always 100%
    summary: str


TRACKS: dict[Track, TrackInfo] = {
    "safe": TrackInfo(
        "Safe Track", 0.75, "Keep your job and income. Smaller weekly blocks, free resources, adjacent roles first."
    ),
    "balanced": TrackInfo(
        "Balanced Track",
        0.9,
        "A steady middle path: learn one core skill, build one piece of evidence, start talking to people.",
    ),
    "fast": TrackInfo(
        "Fast Track",
        1.0,
        "Uses all your weekly hours and starts portfolio and applications earlier. "
        "Often needs more time or paid learning.",
    ),
}


class IncompleteRoadmap(ValueError):
    """The writer returned fewer than 4 usable weeks."""


def clamp_hours(value: object) -> float:
    """Hours per week, 1-40 in half-hour steps. Unreadable input means 5."""
    try:
        n = float(str(value))
    except ValueError:
        return DEFAULT_HOURS
    if not math.isfinite(n):
        return DEFAULT_HOURS
    return min(MAX_HOURS, max(MIN_HOURS, math.floor(n * 2 + 0.5) / 2))


def clamp_minutes(value: int) -> int:
    return min(600, max(5, int(value)))


def normalize_track(value: object) -> Track:
    for track in TRACKS:
        if value == track:
            return track
    return "balanced"


@dataclass
class _Draft:
    """A task between AI draft and final Task: cleaned, not yet given an id."""

    title: str
    type: TaskType
    minutes: int
    why: str
    instructions: list[str]
    deliverable: str
    success: str


def _clean_task(raw: TaskDraft) -> _Draft | None:
    task = _Draft(
        title=clean(raw.title, 120),
        type=raw.type,
        minutes=clamp_minutes(raw.estimated_minutes),
        why=clean(raw.why_this_matters, 400),
        instructions=clean_list(raw.instructions, 6, 300),
        deliverable=clean(raw.deliverable, 300),
        success=clean(raw.success_criteria, 300),
    )
    if not (task.title and task.deliverable and task.success):
        return None
    return task


def quick_start_task(target_role: str) -> _Draft:
    """The in-app practice task added when week 1 lacks a quick one."""
    return _Draft(
        title=f"Try a 10-minute {target_role} practice task",
        type="simulation",
        minutes=QUICK_TASK_MAX_MIN,
        why="One small, realistic task shows you what the work feels like before you put more time into this path.",
        instructions=[
            "Open the practice task from this card.",
            "Read the scenario and the scoring rubric before you write.",
            "Write a short answer. It does not need to be perfect.",
        ],
        deliverable="One short written answer to a realistic work scenario",
        success="You submitted an answer and read the practice feedback for every rubric criterion.",
    )


def _with_quick_start(tasks: list[_Draft], target_role: str) -> list[_Draft]:
    """Week 1: an in-app practice task of <= 10 minutes comes first."""
    out = list(tasks)
    sims = [i for i, t in enumerate(out) if t.type == "simulation"]
    quick = [i for i in sims if out[i].minutes <= QUICK_TASK_MAX_MIN]
    pick = quick[0] if quick else (sims[0] if sims else None)
    if pick is None:
        return [quick_start_task(target_role), *out]
    sim = out.pop(pick)
    sim.minutes = min(sim.minutes, QUICK_TASK_MAX_MIN)  # the in-app task is timeboxed
    return [sim, *out]


@dataclass
class WeekFit:
    tasks: list[_Draft]
    dropped: int = 0
    shortened: bool = False


def fit_week_to_budget(tasks: list[_Draft], budget_minutes: int) -> WeekFit:
    """Keep tasks in order while they fit the budget. Never an empty week: if
    even the first task is too long, it is shortened to fit."""
    kept: list[_Draft] = []
    used = 0
    for t in tasks:
        if len(kept) < MAX_TASKS_PER_WEEK and used + t.minutes <= budget_minutes:
            kept.append(t)
            used += t.minutes
    dropped = len(tasks) - len(kept)
    if not kept and tasks:
        first = tasks[0]
        first.minutes = budget_minutes
        return WeekFit(tasks=[first], dropped=len(tasks) - 1, shortened=True)
    return WeekFit(tasks=kept, dropped=dropped)


def _unique_id(base: str, used: set[str]) -> str:
    candidate, n = base, 2
    while candidate in used:
        candidate, n = f"{base}-{n}", n + 1
    used.add(candidate)
    return candidate


def _hours_text(hours: float) -> str:
    return f"{hours:g} hour" + ("" if hours == 1 else "s")


def build_roadmap(
    draft: RoadmapDraft,
    *,
    roadmap_id: str,
    career: Career,
    current_role: str,
    track: Track,
    hours_per_week: float,
    created_at: str,
) -> Roadmap:
    hours = clamp_hours(hours_per_week)
    budget = int(hours * 60)
    target_role = clean(career.title, 120) or "new role"
    if len(draft.weeks) < WEEKS:
        raise IncompleteRoadmap(f"A roadmap needs {WEEKS} weeks, got {len(draft.weeks)}.")
    cautions = clean_list(draft.cautions, 6)
    used_ids: set[str] = set()
    weeks: list[Week] = []

    for i, raw_week in enumerate(draft.weeks[:WEEKS]):
        number = i + 1
        tasks = [t for t in (_clean_task(r) for r in raw_week.tasks) if t is not None]
        if number == 1:
            tasks = _with_quick_start(tasks, target_role)
        if not tasks:
            raise IncompleteRoadmap(f"Week {number} has no usable task.")
        fit = fit_week_to_budget(tasks, budget)
        if fit.dropped:
            noun = "task was" if fit.dropped == 1 else "tasks were"
            cautions.append(
                f"Week {number}: {fit.dropped} suggested {noun} left out to keep the week within {_hours_text(hours)}."
            )
        if fit.shortened:
            cautions.append(
                f"Week {number}: the main task was shortened to fit {_hours_text(hours)}. "
                "Consider adding time if you can."
            )
        weeks.append(
            Week(
                week=number,
                title=clean(raw_week.title, 100) or f"Week {number}",
                objective=clean(raw_week.objective, 300),
                tasks=[
                    Task(
                        id=_unique_id(f"w{number}-{slug(t.title)}", used_ids),
                        title=t.title,
                        type=t.type,
                        estimated_minutes=t.minutes,
                        why_this_matters=t.why,
                        instructions=t.instructions,
                        deliverable=t.deliverable,
                        success_criteria=t.success,
                    )
                    for t in fit.tasks
                ],
            )
        )

    return Roadmap(
        id=roadmap_id,
        target_career_id=career.id or slug(target_role),
        current_role=clean(current_role, 120) or "Your current role",
        target_role=target_role,
        track=normalize_track(track),
        hours_per_week=hours,
        created_at=created_at,
        weeks=weeks,
        assumptions=clean_list(draft.assumptions, 6),
        cautions=cautions,
    )


def check_roadmap(roadmap: Roadmap) -> list[str]:
    """Everything that must hold for a roadmap. Empty list = OK."""
    if len(roadmap.weeks) != WEEKS:
        return [f"Roadmap must have exactly {WEEKS} weeks."]
    problems: list[str] = []
    budget = roadmap.hours_per_week * 60
    ids: set[str] = set()
    for week in roadmap.weeks:
        minutes = sum(t.estimated_minutes for t in week.tasks)
        if not 1 <= len(week.tasks) <= MAX_TASKS_PER_WEEK:
            problems.append(f"Week {week.week} has {len(week.tasks)} tasks.")
        if minutes > budget:
            problems.append(f"Week {week.week} needs {minutes} min, over the {budget:g} min available.")
        for t in week.tasks:
            if not t.id or t.id in ids:
                problems.append(f"Task id missing or repeated: {t.id}")
            ids.add(t.id)
            if not (t.title and t.deliverable and t.success_criteria):
                problems.append(f"Task {t.id} lacks a title, deliverable or success criterion.")
            if t.estimated_minutes <= 0:
                problems.append(f"Task {t.id} has no time estimate.")
    if not any(t.estimated_minutes <= QUICK_TASK_MAX_MIN for t in roadmap.weeks[0].tasks):
        problems.append("Week 1 has no task of 10 minutes or less.")
    return problems
