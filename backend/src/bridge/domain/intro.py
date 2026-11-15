"""Meeting a job before planning for it: what it is, what the person does all
day, and what is hard. The AI writes the words; here lists are bounded and
cleaned, and nothing numeric (pay) comes from the AI."""

from __future__ import annotations

from bridge.domain.drafts import JobIntroDraft
from bridge.domain.models import CamelModel
from bridge.domain.text import clean, clean_list


class DaySlot(CamelModel):
    time: str
    what: str


class JobIntro(CamelModel):
    role: str
    one_liner: str
    responsibilities: list[str]
    day: list[DaySlot]
    tools: list[str]
    you_will_like: list[str]
    hard_parts: list[str]
    how_to_start: list[str]


class IntroTooThin(ValueError):
    """The writer gave too little to show a useful introduction."""


def normalize_intro(role: str, draft: JobIntroDraft) -> JobIntro:
    intro = JobIntro(
        role=clean(role, 80),
        one_liner=clean(draft.one_liner, 220),
        responsibilities=clean_list(draft.responsibilities, 6, 140),
        day=[DaySlot(time=clean(s.time, 12), what=clean(s.what, 140)) for s in draft.day[:5] if clean(s.what, 140)],
        tools=clean_list(draft.tools, 6, 40),
        you_will_like=clean_list(draft.you_will_like, 3, 120),
        hard_parts=clean_list(draft.hard_parts, 3, 120),
        how_to_start=clean_list(draft.how_to_start, 3, 160),
    )
    if not intro.one_liner or len(intro.responsibilities) < 3 or len(intro.day) < 3:
        raise IntroTooThin("The job introduction came back too thin.")
    return intro
