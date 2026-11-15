"""The writer contract. A writer produces drafts; the rules in bridge.domain
turn drafts into what the user sees. Two writers exist: ClaudeWriter (live)
and DemoWriter (labeled sample data, no AI). Tests pass their own."""

from __future__ import annotations

from typing import Protocol

from bridge.domain.drafts import (
    CareersDraft,
    CoursePickDraft,
    EvaluationDraft,
    JobIntroDraft,
    PayGuessDraft,
    PracticeDraft,
    RoadmapDraft,
)
from bridge.domain.models import Candidate, Career, Practice, ResumeSource, Track
from bridge.domain.wages import Figure, Snippet
from bridge.domain.web import Found


class LlmError(Exception):
    """A failure the user can act on. `message` is shown as is."""

    def __init__(self, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


class Writer(Protocol):
    async def careers(self, *, resume: str, candidate: Candidate, source: ResumeSource = "cv") -> CareersDraft: ...

    async def roadmap(
        self, *, candidate: Candidate, career: Career, track: Track, hours_per_week: float
    ) -> RoadmapDraft: ...

    async def practice(
        self, *, candidate: Candidate, career: Career, task_title: str, task_deliverable: str
    ) -> PracticeDraft: ...

    async def evaluate(self, *, practice: Practice, answer: str) -> EvaluationDraft: ...

    async def sample_answer(self, *, practice: Practice, candidate: Candidate) -> str: ...

    async def introduce(self, *, role: str, current_role: str, country: str) -> JobIntroDraft: ...

    async def pay_research(self, *, role: str, place: str) -> tuple[list[Snippet], list[Figure]]: ...

    async def pay_guess(self, *, role: str, place: str) -> PayGuessDraft | None: ...

    async def course_search(
        self, *, role: str, budget: str, domains: list[str]
    ) -> tuple[list[Found], list[CoursePickDraft]]: ...

    async def read_linkedin(self, *, url: str) -> str | None: ...
