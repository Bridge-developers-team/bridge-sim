"""Practice-task rules. The AI writes the task and proposes scores; code sets
rubric ids and score ranges, checks every quote against the answer, and caps
any score above 1 that has no real quote behind it."""

from __future__ import annotations

from bridge.domain.drafts import EvaluationDraft, PracticeDraft
from bridge.domain.evidence import verify_evidence
from bridge.domain.models import CriterionResult, Evaluation, Practice, RubricCriterion
from bridge.domain.text import clean, clean_list

UNPROVEN_SCORE_CAP = 1
MIN_CRITERIA = 3
MAX_CRITERIA = 4
MIN_ANSWER_WORDS = 15


class IncompletePractice(ValueError):
    """The writer's task lacks a scenario, brief, deliverable or 3 criteria."""


def _clamp(value: int, lo: int, hi: int) -> int:
    return min(hi, max(lo, int(value)))


def build_practice(draft: PracticeDraft, *, practice_id: str, target_role: str) -> Practice:
    rubric = [(clean(c.label, 80), clean(c.description, 300), _clamp(c.max_score, 3, 5)) for c in draft.rubric]
    rubric = [r for r in rubric if r[0] and r[1]][:MAX_CRITERIA]
    if len(rubric) < MIN_CRITERIA:
        raise IncompletePractice(f"A practice rubric needs at least {MIN_CRITERIA} criteria.")
    practice = Practice(
        id=practice_id,
        target_role=clean(target_role, 120),
        scenario=clean(draft.scenario, 1500),
        brief=clean(draft.brief, 1200),
        expected_deliverable=clean(draft.expected_deliverable, 400),
        timebox_minutes=_clamp(draft.timebox_minutes, 5, 20),
        rubric=[
            RubricCriterion(id=f"c{i + 1}", label=label, description=desc, max_score=top)
            for i, (label, desc, top) in enumerate(rubric)
        ],
    )
    if not (practice.scenario and practice.brief and practice.expected_deliverable):
        raise IncompletePractice("Practice task is missing its scenario, brief or deliverable.")
    return practice


def word_count(text: str) -> int:
    return len(text.split())


def score_evaluation(answer: str, practice: Practice, draft: EvaluationDraft) -> Evaluation:
    """One result per rubric criterion, in rubric order. A criterion the AI
    skipped falls back to its position, then to a zero score."""
    by_id = {c.rubric_id: c for c in draft.criteria}
    results: list[CriterionResult] = []
    for i, criterion in enumerate(practice.rubric):
        c = by_id.get(criterion.id) or (draft.criteria[i] if i < len(draft.criteria) else None)
        raw_score = _clamp(c.score, 0, criterion.max_score) if c else 0
        quote = clean(c.evidence, 400) if c else ""
        verified = verify_evidence(answer, quote)
        score = raw_score if verified or raw_score <= UNPROVEN_SCORE_CAP else UNPROVEN_SCORE_CAP
        results.append(
            CriterionResult(
                rubric_id=criterion.id,
                label=criterion.label,
                score=score,
                score_raw=raw_score,
                max_score=criterion.max_score,
                verified=verified,
                evidence=quote if verified else "",
                strengths=clean_list(c.strengths if c else [], 3),
                improvements=clean_list(c.improvements if c else [], 3),
            )
        )
    return Evaluation(
        practice_id=practice.id,
        criteria=results,
        total_score=sum(r.score for r in results),
        max_total=sum(r.max_score for r in results),
        overall_feedback=clean(draft.overall_feedback, 800),
        next_revision_step=clean(draft.next_revision_step, 400),
    )
