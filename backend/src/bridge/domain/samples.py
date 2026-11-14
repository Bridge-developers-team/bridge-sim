"""SAMPLE profiles for demos. Fictional people; employers marked fictional.
The demo writer (llm/demo.py) has hand-written career paths for each, whose
quotes are copied verbatim from these texts so they pass the quote check."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Sample:
    id: str
    label: str
    resume: str


TEACHER = Sample(
    id="teacher",
    label="Sample: School teacher, 7 years",
    resume="""SAMPLE PROFILE (fictitious person, no real identifiers)
Middle-school English teacher, 7 years

Experience
- English teacher, grades 6-8, a public middle school (2019-present)
  - Teach 5 classes (about 130 students) a year; plan every unit from state standards to final assessment.
  - Redesigned the 7th grade persuasive-writing unit into short self-paced lessons with checklists; the share of \
students meeting the standard on the unit essay rose from 58% to 71% in one year.
  - Built and maintain the department's shared Google Classroom library of 40+ lessons, used by 5 teachers.
  - Write rubrics and quick formative checks; review results every two weeks and reteach where students struggle.
  - Lead two 45-minute professional-development sessions per year for colleagues on giving feedback.
  - Coordinate the yearly 8th grade showcase: schedule, volunteers, communication with 120 families.
- Long-term substitute teacher, a public school district (2018-2019)

Education
- B.A. English
- State teaching license, English Language Arts 6-12

Skills
- Lesson and unit design, rubric writing, formative assessment, Google Classroom, Google Slides, Canva, \
presenting to groups, family communication""",
)

NURSE = Sample(
    id="nurse",
    label="Sample: ICU nurse, 6 years",
    resume="""James Carter, RN (SAMPLE)
Registered Nurse, Intensive Care, 6 years
Columbus, OH

Experience
- ICU Registered Nurse, Riverside Medical Center (fictional) (2020-present)
  - Care for 2 critical patients per 12-hour shift in a 36-bed medical ICU.
  - Unit "super user" for the Epic EHR rollout; trained 40 nurses on charting workflows.
  - Member of the unit falls and pressure-injury committee; track monthly incident counts in Excel.
- Med-Surg Registered Nurse, Eastside Community Hospital (fictional) (2018-2020)

Education
- BSN, The Ohio State University
- CCRN certification

Skills
- Clinical assessment, Epic charting, Excel (pivot tables, basic charts), quality-improvement projects, \
patient and family communication""",
)

RETAIL = Sample(
    id="retail",
    label="Sample: Retail store manager, 10 years",
    resume="""Aisha Thompson (SAMPLE)
Store Manager, big-box retail, 10 years
Atlanta, GA

Experience
- Store Manager, Northgate Superstore (fictional chain) (2019-present)
  - Run a $28M-a-year store with 120 team members and 6 department leads.
  - Cut overtime 18% by rebuilding weekly schedules around hourly traffic data.
  - Led a backroom reorganization that reduced out-of-stocks on top 200 items.
- Assistant Store Manager, ValueMart (fictional chain) (2014-2019)

Education
- B.A. Communications, Georgia State University

Skills
- Scheduling and labor budgets, inventory and shrink, hiring and coaching, weekly sales reporting, \
conflict resolution""",
)

SAMPLES: tuple[Sample, ...] = (TEACHER, NURSE, RETAIL)

# "Try demo": the teacher, 5 free hours a week, no learning budget.
DEMO_PERSONA: dict[str, object] = {
    "sampleId": TEACHER.id,
    "currentRole": "Middle-school English teacher",
    "yearsExperience": 7,
    "changeMotivation": ["Less stress", "Better work-life balance"],
    "hoursPerWeek": 5,
    "monthlyLearningBudget": 0,
    "currency": "USD",
    "location": "Austin, TX",
    "country": "us",
    "interestedRoles": [],
    "transitionPreference": "balanced",
}
