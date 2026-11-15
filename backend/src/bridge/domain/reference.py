"""Reference data: the facts the rules work with (countries, cities, job
titles, study fields and their courses, official pay tables, sample CVs).

It lives in the database (db/reference.py loads it, seeded from the reviewed
files in db/seed/). This module only defines its shape and holds the loaded
copy: the app installs it once at start-up, and the rules read it with
`get()`. Domain code never touches the database or the files itself."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import Field as PydanticField

from bridge.domain.models import CamelModel

# free: no charge at all. paid: a paid plan, subscription or trial. Coursera
# courses count as paid: its own FAQ says course materials need the paid
# certificate option, with a free trial or a no-certificate option on some.
Cost = Literal["free", "paid"]
Format = Literal["certificate", "course", "lectures"]
Pace = Literal["weekly", "course"]


class Course(CamelModel):
    id: str
    title: str
    provider: str
    url: str
    cost: Cost
    format: Format
    length: str = ""  # the provider's own estimate, never ours
    modules: list[str] = PydanticField(default_factory=list)
    pace: Pace = "course"
    why: str = ""
    # Paid only: the provider's US monthly price, rounded (Coursera programs
    # are $49 a month; checked November 2026). 0 = unknown or free.
    monthly_usd: int = 0
    found: bool = False  # True for a course the AI found on the web for this exact role


@dataclass(frozen=True)
class Field:
    """A study field: how role titles are recognised, its courses (best
    first), and how it maps to recruiter searches and official pay tables."""

    id: str
    label: str
    keywords: tuple[str, ...]
    courses: tuple[str, ...]
    linkedin_term: str = ""
    us_soc: str = ""
    kz_key: str = ""


@dataclass(frozen=True)
class Country:
    code: str  # ISO 3166-1 alpha-2, lowercase
    name: str
    currency: str  # ISO 4217, "" when unknown
    linkedin_geo: str = ""  # LinkedIn's geo id, "" when not confirmed
    indeed_host: str = ""
    adzuna: bool = False


@dataclass(frozen=True)
class UsPay:
    source: str
    states: dict[str, str]  # "TX" -> "Texas"
    titles: dict[str, str]  # SOC code -> official title
    medians: dict[str, dict[str, int | None]]  # SOC code -> {"US" | state: median}


@dataclass(frozen=True)
class KzPay:
    source: str
    url: str
    occupations: dict[str, tuple[str, dict[str, int]]]  # field key -> (title, {industry: average})


@dataclass(frozen=True)
class Sample:
    id: str
    label: str
    resume: str


@dataclass(frozen=True)
class Reference:
    countries: dict[str, Country]
    cities: dict[str, list[str]]  # country code -> names, largest first
    usd_rates: dict[str, float]  # fallback units per US dollar
    lists: dict[str, list[str]]  # currentRoles, targetRoles, motivations, courseDomains, jobTitles
    courses: dict[str, Course]
    fields: tuple[Field, ...]  # the real fields, in matching order
    general: Field  # no matching field
    pay_us: UsPay
    pay_kz: KzPay
    samples: tuple[Sample, ...]
    demo_persona: dict[str, Any] = field(default_factory=dict)

    def field(self, field_id: str) -> Field | None:
        if field_id == self.general.id:
            return self.general
        return next((f for f in self.fields if f.id == field_id), None)

    def country(self, code: str) -> Country | None:
        return self.countries.get(code)

    def sample(self, sample_id: str) -> Sample | None:
        return next((s for s in self.samples if s.id == sample_id), None)

    @classmethod
    def from_data(cls, data: dict[str, Any]) -> Reference:
        """From the seed/DB shape: one entry per dataset name."""
        fields = [
            Field(
                id=f["id"],
                label=f["label"],
                keywords=tuple(f["keywords"]),
                courses=tuple(f["courses"]),
                linkedin_term=f.get("linkedinTerm", ""),
                us_soc=f.get("usSoc", ""),
                kz_key=f.get("kzKey", ""),
            )
            for f in data["fields"]
        ]
        general = next(f for f in fields if f.id == "general")
        us, kz, samples = data["pay_us"], data["pay_kz"], data["samples"]
        return cls(
            countries={
                c["code"]: Country(
                    code=c["code"],
                    name=c["name"],
                    currency=c.get("currency", ""),
                    linkedin_geo=c.get("linkedinGeo", ""),
                    indeed_host=c.get("indeedHost", ""),
                    adzuna=bool(c.get("adzuna")),
                )
                for c in data["countries"]
            },
            cities=data["cities"],
            usd_rates={k: float(v) for k, v in data["currencies"].items()},
            lists=data["lists"],
            courses={c["id"]: Course.model_validate(c) for c in data["courses"]},
            fields=tuple(f for f in fields if f.id != "general"),
            general=general,
            pay_us=UsPay(source=us["source"], states=us["states"], titles=us["titles"], medians=us["medians"]),
            pay_kz=KzPay(
                source=kz["source"],
                url=kz["url"],
                occupations={k: (v["title"], v["byIndustry"]) for k, v in kz["occupations"].items()},
            ),
            samples=tuple(Sample(id=s["id"], label=s["label"], resume=s["resume"]) for s in samples["samples"]),
            demo_persona=samples["demoPersona"],
        )


_current: Reference | None = None


def install(reference: Reference) -> None:
    """Called once at start-up (main.py) with the data loaded from the DB."""
    global _current
    _current = reference


def get() -> Reference:
    if _current is None:
        raise RuntimeError("Reference data is not loaded: the app installs it at start-up.")
    return _current
