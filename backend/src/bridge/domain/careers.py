"""Career-path rules. The AI proposes paths; here near-duplicates are dropped,
lists are bounded, and every "skill you already have" must quote the resume.
A skill whose quote is not in the resume stays visible but is marked
unverified, so the UI can label it as an AI inference."""

from __future__ import annotations

import re

from bridge.domain.drafts import CareerDraft
from bridge.domain.evidence import normalize, verify_evidence
from bridge.domain.models import Career, TransferableSkill
from bridge.domain.text import clean, clean_list, slug

PATHS = 3
_SENIORITY = re.compile(r"\b(senior|junior|entry[- ]level|associate|lead|corporate|specialist)\b")


class NotEnoughCareers(ValueError):
    """The writer returned fewer than 3 distinct paths."""


def title_key(title: str) -> str:
    """ "Senior Instructional Designer (Corporate)" and "instructional designer"
    are the same path."""
    s = normalize(title)
    s = re.sub(r"\(.*?\)", " ", s)
    s = _SENIORITY.sub(" ", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def normalize_career(draft: CareerDraft, resume: str) -> Career | None:
    title = clean(draft.title, 80)
    if not title:
        return None
    skills: list[TransferableSkill] = []
    for s in draft.transferable_skills:
        name = clean(s.skill, 60)
        if not name:
            continue
        quote = clean(s.evidence, 300)
        verified = bool(resume) and verify_evidence(resume, quote)
        skills.append(TransferableSkill(skill=name, evidence=quote if verified else "", verified=verified))
    return Career(
        id=slug(title),
        title=title,
        role_summary=clean(draft.role_summary, 300),
        fit_explanation=clean(draft.fit_explanation, 500),
        transferable_skills=skills[:4],
        missing_skills=clean_list(draft.missing_skills, 4, 120),
        relative_effort=draft.relative_effort,
        key_tradeoff=clean(draft.key_tradeoff, 300),
        assumptions=clean_list(draft.assumptions, 3, 300),
        motivation_match=clean(draft.motivation_match, 400),
        field=draft.field,
        job_titles=_titles(draft.job_titles, title),
        video_searches=clean_list(draft.video_searches, 3, 80),
        work_modes=list(dict.fromkeys(draft.work_modes))[:3],
    )


def _titles(titles: list[str], fallback: str) -> list[str]:
    """Job-post titles to search for: the AI's, de-duplicated, else the path's own."""
    out: list[str] = []
    for t in clean_list(titles, 5, 80):
        if t.lower() not in {o.lower() for o in out}:
            out.append(t)
    return out[:3] or [fallback]


def normalize_careers(drafts: list[CareerDraft], resume: str) -> list[Career]:
    """Exactly 3 distinct careers, or NotEnoughCareers."""
    seen: set[str] = set()
    out: list[Career] = []
    for draft in drafts:
        career = normalize_career(draft, resume)
        if career is None:
            continue
        key = title_key(career.title)
        if key in seen:
            continue
        seen.add(key)
        out.append(career)
        if len(out) == PATHS:
            return out
    raise NotEnoughCareers(f"Need {PATHS} distinct career paths, got {len(out)}.")


def normalize_years(value: object) -> int | None:
    """Plausible years of experience (0-60), else None (unknown)."""
    if value is None or isinstance(value, bool) or value == "":
        return None
    try:
        n = float(str(value))
    except ValueError:
        return None
    if n != n or n < 0 or n > 60:  # n != n: NaN
        return None
    return int(n + 0.5)  # half up, not Python's half-to-even


def bound_career(career: Career) -> Career:
    """A career that came back from the browser: same limits as a fresh one,
    so a tampered card cannot smuggle a long text into a prompt."""
    return Career(
        id=clean(career.id, 60) or slug(career.title),
        title=clean(career.title, 80),
        role_summary=clean(career.role_summary, 300),
        fit_explanation=clean(career.fit_explanation, 500),
        transferable_skills=[
            TransferableSkill(skill=clean(s.skill, 60), evidence=clean(s.evidence, 300), verified=s.verified)
            for s in career.transferable_skills[:4]
        ],
        missing_skills=clean_list(career.missing_skills, 4, 120),
        relative_effort=career.relative_effort,
        key_tradeoff=clean(career.key_tradeoff, 300),
        assumptions=clean_list(career.assumptions, 3, 300),
        motivation_match=clean(career.motivation_match, 400),
        field=clean(career.field, 40),
        job_titles=clean_list(career.job_titles, 3, 80),
        video_searches=clean_list(career.video_searches, 3, 80),
        work_modes=list(dict.fromkeys(career.work_modes))[:3],
    )
