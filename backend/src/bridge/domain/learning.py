"""Courses to study for a target role. A hand-checked catalog, not AI output:
every URL below was opened and its title checked before it went in, and each
syllabus is the provider's own list of modules. Free courses come first; paid
certificates are offered only when the user set a learning budget.

The study plan maps the main course onto the 30-day roadmap: a lecture series
moves one module a week, a certificate one or two modules a month."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import TYPE_CHECKING, Literal

from bridge.domain import reference
from bridge.domain.models import CamelModel
from bridge.domain.reference import Course, Field
from bridge.domain.text import clean, slug
from bridge.domain.web import Found, host

if TYPE_CHECKING:  # drafts imports this module's FieldId
    from bridge.domain.drafts import CoursePickDraft

# The study fields the catalog covers, plus "other" for every role it does not.
# The AI picks one per career (drafts.py); keep in sync with db/seed/fields.json
# (a test checks).
FieldId = Literal[
    "health-data",
    "security",
    "qa",
    "ux",
    "product",
    "web",
    "software",
    "it-support",
    "data",
    "project",
    "learning",
    "hr",
    "sales",
    "marketing",
    "finance",
    "writing",
    "content",
    "business",
    "other",
]

CHECKED = "November 2026"  # when the catalog's links and syllabi were last checked

# The catalog itself (courses, and which fields use which courses) is
# reference data in the database: see domain/reference.py and db/seed/.


# Titles where a keyword would pick the wrong field: a personal trainer is not
# a corporate trainer, a security guard is not in cybersecurity, a video
# editor is not a copy editor. These go to GENERAL unless the AI said otherwise.
_NOT_A_FIELD = re.compile(
    r"\b(personal|fitness|athletic|sports?|dog|horse|yoga|pilates)\s+(trainer|coach|instructor)"
    r"|\bsecurity\s+(guard|officer)|\b(video|film|photo|music|sound)\s+editor"
    r"|\bdriving\s+instructor|\b(music|art|dance|drama)\s+(teacher|tutor|instructor|educator)"
)


def field_prompt_list() -> str:
    """The fields as the AI sees them: "id: label", one per line."""
    fields = reference.get().fields
    return "\n".join(f"- {f.id}: {f.label}" for f in fields) + "\n- other: none of the above really fits"


def _pattern(keyword: str) -> re.Pattern[str]:
    return re.compile(r"(?<![a-z0-9])" + re.escape(keyword) + r"(?![a-z0-9])")


@lru_cache(maxsize=4)
def _patterns(fields: tuple[Field, ...]) -> list[tuple[Field, list[re.Pattern[str]]]]:
    return [(f, [_pattern(k) for k in f.keywords]) for f in fields]


def match_field(role: str, field_id: str = "") -> Field:
    """The field a role belongs to. The AI's choice wins when it names a known
    field ("other" means none fits: GENERAL). Without one (demo data, cards
    saved before the AI chose fields), the title's keywords decide; GENERAL
    when nothing matches."""
    ref = reference.get()
    if field_id == "other":
        return ref.general
    known = ref.field(field_id) if field_id else None
    if known:
        return known
    title = clean(role, 120).lower()
    if _NOT_A_FIELD.search(title):
        return ref.general
    for field, patterns in _patterns(ref.fields):
        if any(p.search(title) for p in patterns):
            return field
    return ref.general


def field_by_id(field_id: str) -> Field | None:
    return reference.get().field(field_id)


def course_domains() -> list[str]:
    """Where the AI may look for courses: course platforms, universities and
    official training sites (never a search page: domain/web.py drops those)."""
    return list(reference.get().lists.get("courseDomains", []))


class StudyWeek(CamelModel):
    week: int
    modules: list[str]


class StudyPlan(CamelModel):
    field: str
    field_label: str
    matched: bool  # False: no catalog field fits this role, so web-found courses lead
    budget_usd: int  # the user's monthly learning budget in US dollars (approximate)
    main: Course | None  # None: no hand-checked course the user can take for this field
    weeks: list[StudyWeek]  # what of the main course goes into each roadmap week
    later: list[str]  # main-course modules left after the 30 days
    more: list[Course]  # other good options the user can take
    checked: str = CHECKED


COURSERA_MONTHLY_USD = 49


def affordable(course: Course, budget_usd: int) -> bool:
    """Free courses always; a paid one when the monthly budget covers its
    monthly price (Coursera's $49 when the price is unknown)."""
    if course.cost != "paid":
        return True
    return budget_usd > 0 and budget_usd >= (course.monthly_usd or COURSERA_MONTHLY_USD)


def month_modules(course: Course, hours_per_week: float) -> int:
    """How many modules fit in 30 days. A weekly lecture series moves one
    module a week; a certificate module takes weeks, so one a month, or two
    with 8 or more hours a week."""
    if not course.modules:
        return 0
    if course.pace == "weekly":
        return min(4, len(course.modules))
    return min(len(course.modules), 2 if hours_per_week >= 8 else 1)


def spread(modules: list[str], weeks: int = 4) -> list[list[str]]:
    """Modules over the weeks, in order, every week non-empty: with fewer
    modules than weeks a module runs over several weeks."""
    if not modules:
        return [[] for _ in range(weeks)]
    return [
        [modules[min(len(modules) - 1, w * len(modules) // weeks)]]
        if len(modules) <= weeks
        else modules[w * len(modules) // weeks : (w + 1) * len(modules) // weeks]
        for w in range(weeks)
    ]


def study_plan(role: str, budget_usd: int, hours_per_week: float, weeks: int = 4, field_id: str = "") -> StudyPlan:
    ref = reference.get()
    field = match_field(role, field_id)
    catalog = [ref.courses[c] for c in field.courses if c in ref.courses]
    usable = [c for c in catalog if affordable(c, budget_usd)]
    if not usable:
        # Better no course than one from an unrelated field; the web search
        # for the exact role fills the panel instead.
        return StudyPlan(
            field=field.id,
            field_label=field.label,
            matched=False,
            budget_usd=max(0, budget_usd),
            main=None,
            weeks=[],
            later=[],
            more=[],
        )
    main = usable[0]
    n = month_modules(main, hours_per_week)
    month = main.modules[:n]
    return StudyPlan(
        field=field.id,
        field_label=field.label,
        matched=field.id != ref.general.id,
        budget_usd=max(0, budget_usd),
        main=main,
        weeks=[StudyWeek(week=i + 1, modules=m) for i, m in enumerate(spread(month, weeks))],
        later=main.modules[n:],
        more=usable[1:5],
    )


# ---------- Courses found on the web for one exact role ----------

MAX_FOUND = 8


def pick_courses(found: list[Found], picks: list[CoursePickDraft], budget_usd: int) -> list[Course]:
    """The AI's picks among real search results, by number. Invented numbers
    are ignored; paid picks are dropped when the user has no budget."""
    out: list[Course] = []
    used: set[int] = set()
    for p in picks:
        if p.index in used or not 0 <= p.index < len(found):
            continue
        used.add(p.index)
        if not p.free and budget_usd <= 0:
            continue
        r = found[p.index]
        out.append(
            Course(
                id="web-" + slug(r.url)[:40],
                title=r.title,
                provider=host(r.url),
                url=r.url,
                cost="free" if p.free else "paid",
                format="lectures" if host(r.url).endswith("youtube.com") else "course",
                why=clean(p.why, 160),
                found=True,
            )
        )
        if len(out) == MAX_FOUND:
            break
    return out
