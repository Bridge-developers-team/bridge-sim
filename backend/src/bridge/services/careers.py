"""Use case: resume + form answers -> 3 career paths."""

from __future__ import annotations

from dataclasses import dataclass

from bridge.domain.careers import NotEnoughCareers, normalize_careers, normalize_years
from bridge.domain.models import Candidate, Career, ResumeSource
from bridge.domain.text import clean
from bridge.llm.base import LlmError, Writer


@dataclass(frozen=True)
class ProfileSummary:
    current_role: str
    years_experience: int | None
    industry: str
    evidence_note: str
    standout: str


async def recommend_careers(
    writer: Writer, *, resume: str, candidate: Candidate, source: ResumeSource = "cv"
) -> tuple[ProfileSummary, list[Career]]:
    draft = await writer.careers(resume=resume, candidate=candidate, source=source)
    try:
        careers = normalize_careers(draft.careers, resume)
    except NotEnoughCareers as err:
        raise LlmError("The AI did not return 3 distinct career paths. Try again.", 502) from err
    read = draft.profile
    profile = ProfileSummary(
        # The user's own answers win over what the AI read.
        current_role=candidate.current_role or clean(read.current_role, 120) or "Your current role",
        years_experience=candidate.years_experience
        if candidate.years_experience is not None
        else normalize_years(read.years_experience),
        industry=clean(read.industry, 120),
        evidence_note=clean(read.evidence_note, 300),
        standout=clean(read.standout, 400),
    )
    return profile, careers
