"""Request and response bodies. camelCase on the wire, like the domain models.
`profile` stays a loose dict on purpose: domain/profile.py reads only the
fields it allows, so extra keys (income) are dropped, not rejected."""

from __future__ import annotations

from typing import Any

from bridge.domain.intro import JobIntro
from bridge.domain.learning import Course
from bridge.domain.models import CamelModel, Career, Evaluation, Mode, Practice, Proof, Roadmap, Track

MAX_RESUME = 15_000
MIN_RESUME = 80
MAX_ANSWER = 8_000


class CareersRequest(CamelModel):
    resume_text: str
    profile: dict[str, Any] | None = None
    sample: bool = False


class ProfileOut(CamelModel):
    current_role: str
    years_experience: int | None
    industry: str
    evidence_note: str


class CareersResponse(CamelModel):
    profile: ProfileOut
    careers: list[Career]
    mode: Mode


class RoadmapRequest(CamelModel):
    career: Career
    profile: dict[str, Any] | None = None
    track: Track | None = None
    hours_per_week: float | None = None
    sample: bool = False


class RoadmapResponse(CamelModel):
    roadmap: Roadmap
    mode: Mode


class TaskRef(CamelModel):
    id: str
    title: str
    deliverable: str = ""


class PracticeRequest(CamelModel):
    career: Career
    task: TaskRef
    profile: dict[str, Any] | None = None
    sample: bool = False


class PracticeResponse(CamelModel):
    practice: Practice
    practice_token: str
    mode: Mode


class EvaluateRequest(CamelModel):
    practice: Practice
    practice_token: str
    answer: str
    sample: bool = False


class EvaluateResponse(CamelModel):
    evaluation: Evaluation
    result_token: str
    mode: Mode


class SampleAnswerRequest(CamelModel):
    practice: Practice
    profile: dict[str, Any] | None = None
    sample: bool = False


class SampleAnswerResponse(CamelModel):
    answer: str
    mode: Mode


class PublishRequest(CamelModel):
    practice: Practice
    answer: str
    evaluation: Evaluation
    mode: Mode
    result_token: str
    reflection: str = ""
    display_name: str = ""


class PublishResponse(CamelModel):
    proof: Proof
    delete_key: str


class SampleOut(CamelModel):
    id: str
    label: str
    resume: str


class TrackOut(CamelModel):
    id: Track
    label: str
    summary: str


class Limits(CamelModel):
    max_resume: int = MAX_RESUME
    min_resume: int = MIN_RESUME
    max_answer: int = MAX_ANSWER
    min_hours: float
    max_hours: float


class ConfigResponse(CamelModel):
    mode: Mode
    samples: list[SampleOut]
    demo_persona: dict[str, Any]
    tracks: list[TrackOut]
    limits: Limits


class IntroRequest(CamelModel):
    role: str
    current_role: str = ""
    country: str = ""
    sample: bool = False


class IntroResponse(CamelModel):
    intro: JobIntro
    mode: Mode


class CoursesRequest(CamelModel):
    role: str
    budget: float = 0
    currency: str = "USD"
    sample: bool = False


class CoursesResponse(CamelModel):
    courses: list[Course]
    mode: Mode


class PayRequest(CamelModel):
    roles: list[str]
    country: str = "us"
    country_name: str = ""
    location: str = ""
    sample: bool = False


class LinkedInRequest(CamelModel):
    url: str


class LinkedInResponse(CamelModel):
    resume_text: str
    mode: Mode
