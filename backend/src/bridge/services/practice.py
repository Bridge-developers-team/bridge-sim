"""Use cases: one practice task, its graded feedback, and a sample answer.

Tokens (services/signing.py) make the flow tamper-evident without storing
anything: the task is signed when issued, the graded result when scored."""

from __future__ import annotations

from dataclasses import dataclass

from bridge.domain.models import Candidate, Career, Evaluation, Mode, Practice
from bridge.domain.practice import IncompletePractice, build_practice, score_evaluation
from bridge.domain.text import clean
from bridge.llm.base import LlmError, Writer
from bridge.services.signing import Signer

PRACTICE = "practice"
RESULT = "result"


class TamperedError(ValueError):
    """A token does not match the data sent with it."""


def result_payload(practice: Practice, answer: str, evaluation: Evaluation, mode: Mode) -> dict:
    return {
        "practice": practice.model_dump(mode="json"),
        "answer": answer,
        "evaluation": evaluation.model_dump(mode="json"),
        "mode": mode,
    }


@dataclass(frozen=True)
class IssuedPractice:
    practice: Practice
    token: str


@dataclass(frozen=True)
class GradedResult:
    evaluation: Evaluation
    token: str


async def create_practice(
    writer: Writer,
    signer: Signer,
    *,
    candidate: Candidate,
    career: Career,
    task_id: str,
    task_title: str,
    task_deliverable: str,
) -> IssuedPractice:
    draft = await writer.practice(
        candidate=candidate, career=career, task_title=task_title, task_deliverable=task_deliverable
    )
    try:
        practice = build_practice(draft, practice_id=clean(task_id, 80) or "practice", target_role=career.title)
    except IncompletePractice as err:
        raise LlmError("The AI returned an incomplete practice task. Try again.", 502) from err
    return IssuedPractice(practice=practice, token=signer.sign(PRACTICE, practice.model_dump(mode="json")))


async def grade_answer(
    writer: Writer, signer: Signer, *, practice: Practice, practice_token: str, answer: str, mode: Mode
) -> GradedResult:
    if not signer.verify(PRACTICE, practice.model_dump(mode="json"), practice_token):
        raise TamperedError("This practice task was changed or is from an older version. Open it again.")
    draft = await writer.evaluate(practice=practice, answer=answer)
    evaluation = score_evaluation(answer, practice, draft)
    token = signer.sign(RESULT, result_payload(practice, answer, evaluation, mode))
    return GradedResult(evaluation=evaluation, token=token)
