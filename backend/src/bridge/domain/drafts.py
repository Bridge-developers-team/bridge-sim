"""Drafts: what a writer (the AI, or the demo fixtures) hands to the rules.

They double as the AI's structured-output schema, so every field is required,
has no default and no numeric/length constraint (the API guarantees the shape;
counts, ranges and quotes are re-checked in code by careers.py, roadmap.py and
practice.py). Descriptions are part of the prompt: edit them with care.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from bridge.domain.learning import FieldId
from bridge.domain.models import Effort, TaskType


class ProfileRead(BaseModel):
    current_role: str = Field(
        description="Short label of the person's current role, e.g. 'Middle-school English teacher'"
    )
    years_experience: int | None = Field(
        description="Total years in the current career if the text states or clearly implies it, else null"
    )
    industry: str = Field(description="Current industry or field, e.g. 'K-12 education'")
    evidence_note: str = Field(description="One sentence on how complete the resume evidence is; say plainly if thin")
    standout: str = Field(
        description="One sentence, addressed to the person as 'you', on the most distinctive pattern in their "
        "experience: what they repeatedly do and achieve that most people in their role do not. Cite specifics "
        "(numbers, scope, kinds of work). Empty string if the text is too thin to say anything specific."
    )


class SkillDraft(BaseModel):
    skill: str = Field(description="Skill name in 2-5 words")
    evidence: str = Field(description="Exact verbatim quote (4-20 words) copied from the resume that shows this skill")


class CareerDraft(BaseModel):
    title: str = Field(description="Target career title, e.g. 'Instructional Designer'")
    role_summary: str = Field(description="One sentence: what people in this role do all day")
    fit_explanation: str = Field(
        description="1-2 sentences on why it builds on THIS person's experience, naming concrete resume signals"
    )
    transferable_skills: list[SkillDraft] = Field(description="2-4 skills the person already shows")
    missing_skills: list[str] = Field(description="2-4 role-relevant skills to learn, phrased as skills")
    relative_effort: Effort = Field(description="Qualitative transition effort compared with the other two paths")
    key_tradeoff: str = Field(description="One honest trade-off of this path")
    assumptions: list[str] = Field(description="0-3 assumptions or uncertainties behind this recommendation")
    motivation_match: str = Field(
        description="1-2 sentences, addressed as 'you', on how this path serves the reasons they gave for "
        "changing and their constraints (free hours, budget, location), and honestly where it does not. "
        "Empty string if they gave no reasons or constraints."
    )
    field: FieldId = Field(
        description="The study field from the FIELDS list in the instructions that matches this role's day-to-day "
        "work, or 'other' when none of them really fits. Never pick a field just because one word matches."
    )
    job_titles: list[str] = Field(
        description="2-3 job-post titles, as employers write them, this person could apply for first on this path "
        "(the realistic entry point for their seniority), e.g. 'Instructional Designer', 'Learning Experience "
        "Designer', 'Training Specialist'"
    )
    video_searches: list[str] = Field(
        description="2-3 English YouTube searches (3-6 words each) a beginner would type to learn this path's "
        "missing skills, specific to this role, e.g. 'storyboarding for e-learning tutorial'"
    )


class CareersDraft(BaseModel):
    profile: ProfileRead
    careers: list[CareerDraft] = Field(description="Exactly 3 distinct careers")


class TaskDraft(BaseModel):
    title: str = Field(description="Short action title, e.g. 'Analyze 2 instructional designer job descriptions'")
    type: TaskType
    estimated_minutes: int = Field(description="Realistic minutes for this task")
    why_this_matters: str = Field(description="One sentence on why this task moves the switch forward")
    instructions: list[str] = Field(description="2-5 short steps. Name search keywords instead of URLs")
    deliverable: str = Field(description="The concrete thing the user produces")
    success_criteria: str = Field(description="A specific, checkable test of done")


class WeekDraft(BaseModel):
    title: str = Field(description="Milestone title, e.g. 'Explore and validate the role'")
    objective: str = Field(description="One sentence: what this week achieves")
    tasks: list[TaskDraft] = Field(description="2-4 tasks")


class RoadmapDraft(BaseModel):
    weeks: list[WeekDraft] = Field(description="Exactly 4 weeks")
    assumptions: list[str] = Field(description="1-4 assumptions the plan makes")
    cautions: list[str] = Field(description="0-3 honest cautions, e.g. that 30 days is a start, not a full switch")


class CriterionDraft(BaseModel):
    label: str = Field(description="Criterion name, 2-5 words")
    description: str = Field(description="What a top answer does on this criterion")
    max_score: int = Field(description="Integer 3-5")


class PracticeDraft(BaseModel):
    scenario: str = Field(
        description="2-4 sentences: the work situation, using the person's past industry where it helps"
    )
    brief: str = Field(description="What exactly to do, with every fact or excerpt needed inside it")
    expected_deliverable: str = Field(description="The exact output to write")
    timebox_minutes: int = Field(description="10")
    rubric: list[CriterionDraft] = Field(description="3-4 criteria")


class CriterionScoreDraft(BaseModel):
    rubric_id: str = Field(description="The criterion id, e.g. c1")
    score: int = Field(description="Integer from 0 to that criterion's max score")
    evidence: str = Field(
        description="Exact verbatim quote (4-25 words) from the answer behind the score, or empty string"
    )
    strengths: list[str] = Field(description="0-2 specific strengths")
    improvements: list[str] = Field(description="1-2 actionable improvements")


class EvaluationDraft(BaseModel):
    criteria: list[CriterionScoreDraft]
    overall_feedback: str = Field(description="2-3 sentences of overall practice feedback")
    next_revision_step: str = Field(description="The single most useful change for the next draft")


class SampleAnswerDraft(BaseModel):
    answer: str
