"""Shapes the rules work on. They are also what the API sends, so they are
camelCase on the wire (TypeScript side) and snake_case in Python."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

Effort = Literal["lower", "medium", "higher", "unknown"]
TaskType = Literal["research", "learning", "simulation", "portfolio", "networking", "application"]
Track = Literal["safe", "balanced", "fast"]
# "live" = real AI, "demo" = no API key on the server, "sample" = the user
# asked for labeled sample data (e.g. after an AI error).
Mode = Literal["live", "demo", "sample"]
# What the experience text is: an uploaded or pasted CV, a LinkedIn profile
# saved as PDF, or the person's own description. The AI reads each differently.
ResumeSource = Literal["cv", "linkedin", "text"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, serialize_by_alias=True)


class Candidate(CamelModel):
    """The form answers that may reach the AI. Income is deliberately absent:
    it never leaves the browser."""

    current_role: str = ""
    years_experience: int | None = None
    industry: str = ""
    change_motivation: list[str] = []
    hours_per_week: float = 5
    monthly_learning_budget: int = 0
    currency: str = "USD"
    location: str = ""
    country: str = ""  # country name, e.g. "Kazakhstan"; "" when not given
    interested_roles: list[str] = []
    transition_preference: Track = "balanced"


class TransferableSkill(CamelModel):
    skill: str
    evidence: str  # "" when the quote was not found in the resume
    verified: bool


class Career(CamelModel):
    id: str
    title: str
    role_summary: str = ""
    fit_explanation: str = ""
    transferable_skills: list[TransferableSkill] = []
    missing_skills: list[str] = []
    relative_effort: Effort = "unknown"
    key_tradeoff: str = ""
    assumptions: list[str] = []
    motivation_match: str = ""
    field: str = ""  # study field id (learning.py); "" on cards saved before fields existed
    job_titles: list[str] = []
    video_searches: list[str] = []


class Task(CamelModel):
    id: str
    title: str
    type: TaskType
    estimated_minutes: int
    why_this_matters: str = ""
    instructions: list[str] = []
    deliverable: str
    success_criteria: str
    completed: bool = False


class Week(CamelModel):
    week: int
    title: str
    objective: str = ""
    tasks: list[Task]


class Roadmap(CamelModel):
    id: str
    target_career_id: str
    current_role: str
    target_role: str
    track: Track
    hours_per_week: float
    created_at: str
    weeks: list[Week]
    assumptions: list[str] = []
    cautions: list[str] = []


class RubricCriterion(CamelModel):
    id: str
    label: str
    description: str
    max_score: int


class Practice(CamelModel):
    """One practice task (work simulation) with the rubric shown before writing."""

    id: str
    target_role: str
    scenario: str
    brief: str
    expected_deliverable: str
    timebox_minutes: int
    rubric: list[RubricCriterion]


class CriterionResult(CamelModel):
    rubric_id: str
    label: str
    score: int
    score_raw: int  # what the AI proposed, before the quote cap
    max_score: int
    verified: bool
    evidence: str
    strengths: list[str]
    improvements: list[str]


class Evaluation(CamelModel):
    practice_id: str
    criteria: list[CriterionResult]
    total_score: int
    max_total: int
    overall_feedback: str
    next_revision_step: str


class Proof(CamelModel):
    """A published practice result: what a hiring manager sees at /p/<id>.
    Built only from a server-signed result, so scores cannot be edited."""

    id: str
    published_at: str
    mode: Mode
    display_name: str
    reflection: str
    practice: Practice
    answer: str
    evaluation: Evaluation
