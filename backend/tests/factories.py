"""Small builders for drafts, so each test states only what it is about."""

from __future__ import annotations

from bridge.domain.drafts import (
    CareerDraft,
    CriterionDraft,
    CriterionScoreDraft,
    EvaluationDraft,
    PracticeDraft,
    RoadmapDraft,
    SkillDraft,
    TaskDraft,
    WeekDraft,
)
from bridge.domain.models import Career

RESUME = (
    "Middle-school English teacher, 7 years. Plan every unit from state standards to final assessment. "
    "Write rubrics and quick formative checks. Coordinate the yearly showcase with 120 families."
)


def task(title: str = "Read 2 job posts", minutes: int = 30, type_: str = "research", **kw: object) -> TaskDraft:
    return TaskDraft(
        title=title,
        type=type_,  # type: ignore[arg-type]
        estimated_minutes=minutes,
        why_this_matters=str(kw.get("why", "It matters.")),
        instructions=list(kw.get("instructions", ["Step one", "Step two"])),  # type: ignore[call-overload]
        deliverable=str(kw.get("deliverable", "A list")),
        success_criteria=str(kw.get("success", "List has 3 items")),
    )


def week(*tasks: TaskDraft, title: str = "Week") -> WeekDraft:
    return WeekDraft(title=title, objective="Do the week.", tasks=list(tasks))


def roadmap_draft(weeks: list[WeekDraft] | None = None) -> RoadmapDraft:
    if weeks is None:
        weeks = [week(task(f"Task {n}a"), task(f"Task {n}b")) for n in range(1, 5)]
    return RoadmapDraft(weeks=weeks, assumptions=["You have 5 hours"], cautions=[])


def career(title: str = "Instructional Designer") -> Career:
    return Career(id="instructional-designer", title=title, missing_skills=["Storyboarding"])


def career_draft(title: str, quote: str = "Write rubrics and quick formative checks") -> CareerDraft:
    return CareerDraft(
        title=title,
        role_summary="Designs training.",
        fit_explanation="You plan units.",
        transferable_skills=[SkillDraft(skill="Assessment design", evidence=quote)],
        missing_skills=["Authoring tools"],
        relative_effort="lower",
        key_tradeoff="Less classroom time.",
        assumptions=[],
        motivation_match="Fewer evenings of grading.",
        field="learning",
        job_titles=["Instructional Designer", "instructional designer", "Learning Designer"],
        video_searches=["storyboarding tutorial"],
        work_modes=["remote", "remote", "hybrid"],
    )


def practice_draft(criteria: int = 3, max_score: int = 4) -> PracticeDraft:
    return PracticeDraft(
        scenario="A fictional company needs a better learning objective.",
        brief="Rewrite the objective so it is measurable.",
        expected_deliverable="One objective plus a rationale",
        timebox_minutes=10,
        rubric=[
            CriterionDraft(label=f"Criterion {i}", description=f"Does thing {i}", max_score=max_score)
            for i in range(1, criteria + 1)
        ],
    )


def evaluation_draft(*scores: tuple[str, int, str]) -> EvaluationDraft:
    return EvaluationDraft(
        criteria=[
            CriterionScoreDraft(rubric_id=rid, score=s, evidence=q, strengths=["Good"], improvements=["More"])
            for rid, s, q in scores
        ],
        overall_feedback="Solid start.",
        next_revision_step="Add a condition.",
    )
