"""DEMO / SAMPLE DATA ONLY. Used when the server has no API key (demo mode),
or when a user asks for labeled sample data after an AI error. Nothing here is
AI output: career paths are hand-written per sample resume, roadmaps and
practice tasks are templates, and "feedback" is a length heuristic. Every
text says so, and the API marks the response mode as demo or sample.

It answers instantly, which is also what makes "Try demo" fast for judges.
"""

from __future__ import annotations

import math
import re
from typing import cast

from bridge.domain.drafts import (
    CareerDraft,
    CareersDraft,
    CriterionDraft,
    CriterionScoreDraft,
    EvaluationDraft,
    PracticeDraft,
    ProfileRead,
    RoadmapDraft,
    SkillDraft,
    TaskDraft,
    WeekDraft,
)
from bridge.domain.learning import FieldId, match_field
from bridge.domain.models import Candidate, Career, Effort, Practice, ResumeSource, TaskType, Track
from bridge.domain.roadmap import TRACKS, clamp_hours

NOTE = "Sample data (not AI)"


# Job-post titles employers use for each sample path (what to search for).
_JOB_TITLES: dict[str, list[str]] = {
    "Instructional Designer": ["Instructional Designer", "Learning Experience Designer", "E-Learning Developer"],
    "Corporate Trainer": ["Corporate Trainer", "Training Specialist", "Learning and Development Specialist"],
    "Education Project Coordinator": ["Program Coordinator", "Education Program Coordinator", "Project Coordinator"],
    "Clinical Informatics Analyst": ["Clinical Informatics Analyst", "Clinical Applications Analyst", "Epic Analyst"],
    "Quality Improvement Coordinator": [
        "Quality Improvement Coordinator",
        "Quality Coordinator",
        "Patient Safety Specialist",
    ],
    "Clinical Educator": ["Clinical Educator", "Nurse Educator", "Clinical Education Specialist"],
    "Operations Analyst": ["Operations Analyst", "Business Operations Analyst", "Workforce Planning Analyst"],
    "Supply Chain Planner": ["Supply Chain Planner", "Inventory Planner", "Demand Planner"],
    "Human Resources Generalist": ["HR Generalist", "Human Resources Generalist", "HR Coordinator"],
}


def _career(
    title: str,
    summary: str,
    fit: str,
    skills: list[tuple[str, str]],
    missing: list[str],
    effort: Effort,
    tradeoff: str,
    assumption: str,
    job_titles: list[str] | None = None,
) -> CareerDraft:
    field = match_field(title).id
    job_titles = job_titles or _JOB_TITLES.get(title, [title])
    return CareerDraft(
        title=title,
        role_summary=summary,
        fit_explanation=fit,
        transferable_skills=[SkillDraft(skill=s, evidence=q) for s, q in skills],
        missing_skills=missing,
        relative_effort=effort,
        key_tradeoff=tradeoff,
        assumptions=[assumption],
        motivation_match="",  # sample data does not claim to know the person's reasons
        field=cast(FieldId, "other" if field == "general" else field),  # field ids are FieldId (a test checks)
        job_titles=job_titles,
        video_searches=[f"{m} tutorial" for m in missing[:3]],
    )


# Quotes are verbatim from bridge.domain.samples, so they pass the quote check.
_PATHS: dict[str, tuple[ProfileRead, list[CareerDraft]]] = {
    "teacher": (
        ProfileRead(
            current_role="Middle-school English teacher",
            years_experience=7,
            industry="K-12 education",
            evidence_note=f"{NOTE}: hand-written paths for the sample teacher profile.",
            standout="You turn messy material into structured, self-paced learning and check that it works: "
            "your unit redesign moved students meeting the standard from 58% to 71%.",
        ),
        [
            _career(
                "Instructional Designer",
                "Designs training and online courses that help employees learn specific job skills.",
                "You already plan whole units from standards to assessment and turned a writing unit into "
                "self-paced lessons, which is the core loop of instructional design.",
                [
                    ("Unit and lesson design", "plan every unit from state standards to final assessment"),
                    (
                        "Self-paced learning design",
                        "Redesigned the 7th grade persuasive-writing unit into short self-paced lessons "
                        "with checklists",
                    ),
                    ("Assessment and rubrics", "Write rubrics and quick formative checks"),
                ],
                ["E-learning authoring tools", "Storyboarding modules", "Adult learning in the workplace"],
                "lower",
                "Many roles are remote and project-based: less classroom contact, more stakeholder reviews.",
                "Assumes you want to keep building learning experiences.",
            ),
            _career(
                "Corporate Trainer",
                "Runs live training sessions for employees on skills, tools or company processes.",
                "You present to groups every day and already run professional-development sessions for "
                "colleagues, so facilitation transfers directly.",
                [
                    (
                        "Facilitating adult sessions",
                        "Lead two 45-minute professional-development sessions per year for colleagues",
                    ),
                    (
                        "Checking for understanding",
                        "review results every two weeks and reteach where students struggle",
                    ),
                ],
                ["Training needs analysis", "Measuring training impact", "Business-specific content"],
                "medium",
                "Often long delivery days, and you teach content chosen by the business.",
                "Assumes you enjoy the live, in-the-room part of teaching.",
            ),
            _career(
                "Education Project Coordinator",
                "Keeps education programs on track: schedules, people, budgets and communication.",
                "You already coordinate a yearly event with volunteers and 120 families and keep a shared lesson "
                "library running for other teachers.",
                [
                    (
                        "Event and schedule coordination",
                        "Coordinate the yearly 8th grade showcase: schedule, volunteers, "
                        "communication with 120 families",
                    ),
                    (
                        "Shared resource management",
                        "Built and maintain the department's shared Google Classroom library",
                    ),
                ],
                ["Project management workflows", "Budget tracking", "Task-board tools"],
                "medium",
                "More operations and less teaching; you may miss designing the learning itself.",
                "Assumes you are comfortable organizing other people's work.",
            ),
        ],
    ),
    "nurse": (
        ProfileRead(
            current_role="ICU registered nurse",
            years_experience=6,
            industry="Hospital care",
            evidence_note=f"{NOTE}: hand-written paths for the sample nurse profile.",
            standout="You are the one a unit trusts with new systems: you trained 40 nurses on the Epic rollout "
            "and track incident data in Excel.",
        ),
        [
            _career(
                "Clinical Informatics Analyst",
                "Improves how clinicians use electronic health records and clinical software.",
                "You were the unit super user for an EHR rollout and trained other nurses on charting.",
                [
                    ("EHR workflow training", "trained 40 nurses on charting workflows"),
                    ("Clinical frontline insight", "Care for 2 critical patients per 12-hour shift"),
                ],
                ["Requirements gathering", "EHR build basics", "Workflow diagramming"],
                "lower",
                "Less direct patient care; more meetings, tickets and testing.",
                "Assumes you want to stay close to clinical work.",
            ),
            _career(
                "Quality Improvement Coordinator",
                "Tracks safety and quality measures and leads projects that reduce harm.",
                "You already sit on the falls and pressure-injury committee and track incident counts.",
                [("Incident tracking", "track monthly incident counts in Excel")],
                ["Root-cause analysis methods", "Run charts and basic statistics", "Leading improvement projects"],
                "medium",
                "Progress is slow and depends on persuading busy colleagues.",
                "Assumes your committee work was something you enjoyed.",
            ),
            _career(
                "Clinical Educator",
                "Teaches and onboards nurses, and keeps clinical practice up to date.",
                "Training 40 nurses during the EHR rollout is direct evidence of teaching adults in a clinical "
                "setting.",
                [("Teaching clinicians", "trained 40 nurses on charting workflows")],
                ["Curriculum design for adults", "Competency assessment", "Presenting evidence-based practice"],
                "medium",
                "Often requires keeping some clinical hours and a further certification.",
                "Assumes you want to stay in a hospital setting.",
            ),
        ],
    ),
    "retail": (
        ProfileRead(
            current_role="Retail store manager",
            years_experience=10,
            industry="Big-box retail",
            evidence_note=f"{NOTE}: hand-written paths for the sample store-manager profile.",
            standout="You run a large operation by the numbers: a $28M store, 120 people, and overtime cut 18% "
            "with hourly traffic data.",
        ),
        [
            _career(
                "Operations Analyst",
                "Finds and fixes inefficiencies in how a business runs, using data.",
                "You cut overtime by rebuilding schedules around traffic data: that is operations analysis.",
                [
                    (
                        "Data-driven scheduling",
                        "Cut overtime 18% by rebuilding weekly schedules around hourly traffic data",
                    ),
                    ("Running a large operation", "Run a $28M-a-year store with 120 team members"),
                ],
                ["Spreadsheet modeling", "SQL basics", "Process mapping"],
                "lower",
                "Desk-based work with less people leadership than you have now.",
                "Assumes you enjoy the numbers side of running a store.",
            ),
            _career(
                "Supply Chain Planner",
                "Plans inventory and replenishment so products are in the right place at the right time.",
                "You reorganized a backroom and reduced out-of-stocks on the top items.",
                [
                    (
                        "Inventory improvement",
                        "Led a backroom reorganization that reduced out-of-stocks on top 200 items",
                    )
                ],
                ["Demand forecasting", "Inventory planning tools", "Supplier coordination"],
                "medium",
                "Deadlines are tight and problems arrive from suppliers you do not control.",
                "Assumes you like solving stock problems more than floor management.",
            ),
            _career(
                "Human Resources Generalist",
                "Handles hiring, onboarding, employee relations and policy for a group of employees.",
                "You hire and coach a team of 120 and resolve conflicts as part of the job.",
                [("Team leadership at scale", "Run a $28M-a-year store with 120 team members and 6 department leads")],
                ["Employment law basics", "HR information systems", "Structured interviewing"],
                "medium",
                "Often an entry step below your current pay grade.",
                "Assumes people work is the part of your job you like most.",
            ),
        ],
    ),
}

_GENERIC = [
    _career(
        title,
        summary,
        f"{NOTE}: without the AI this is a generic adjacent path, not read from your resume.",
        [],
        missing,
        "unknown",
        f"{NOTE}: no trade-off analysis without the AI.",
        "Generic example. Add an API key, or try a sample resume, for a personal reading.",
    )
    for title, summary, missing in [
        ("Project Coordinator", "Keeps projects on schedule and people informed.", ["Project tools", "Planning"]),
        ("Operations Analyst", "Uses data to improve how a business runs.", ["Spreadsheets", "SQL basics"]),
        ("Customer Success Manager", "Helps customers get value from a product.", ["Account planning", "CRM tools"]),
    ]
]


def _sample_id(resume: str) -> str | None:
    text = resume.lower()
    if re.search(r"\b(teacher|teaching|lesson|classroom)\b", text):
        return "teacher"
    if re.search(r"\b(nurse|rn|icu|patient)\b", text):
        return "nurse"
    if re.search(r"\b(store manager|retail)\b", text):
        return "retail"
    return None


def _task(
    title: str, type_: TaskType, minutes: int, why: str, steps: list[str], deliverable: str, done: str
) -> TaskDraft:
    return TaskDraft(
        title=title,
        type=type_,
        estimated_minutes=minutes,
        why_this_matters=why,
        instructions=steps,
        deliverable=deliverable,
        success_criteria=done,
    )


def _scale_week(tasks: list[TaskDraft], budget_minutes: int, share: float) -> list[TaskDraft]:
    """Shrink a week's tasks so it uses about `share` of the weekly time."""
    total = sum(t.estimated_minutes for t in tasks)
    goal = math.floor(budget_minutes * share)
    if total <= goal:
        return tasks
    factor = goal / total
    out = []
    for i, t in enumerate(tasks):
        if i == 0 and t.type == "simulation":
            out.append(t)
            continue
        minutes = max(10, math.floor(t.estimated_minutes * factor / 5) * 5)
        out.append(t.model_copy(update={"estimated_minutes": minutes}))
    return out


_LEARNING_ROLE = re.compile(r"instruct|learning design|e-learning", re.IGNORECASE)

_ID_PRACTICE = PracticeDraft(
    scenario="A fictional regional delivery company onboards 40 new warehouse staff each month. Their old safety "
    "training says: 'Employees will understand the loading-dock safety rules.' The training manager asks you, "
    "the new instructional designer, to fix this objective before the module is rebuilt.",
    brief="Rewrite the objective so it is measurable and fits adult learners in their first week. Facts: the module "
    "is 15 minutes long; staff must be able to do a pre-shift dock check (wheel chocks set, dock plate locked, "
    "lights green) before they work alone. Then explain your change in 2-3 sentences.",
    expected_deliverable="One learning objective plus 2-3 sentences of rationale",
    timebox_minutes=10,
    rubric=[
        CriterionDraft(
            label="Measurable action",
            description="Uses an observable verb (perform, check, identify) instead of 'understand'.",
            max_score=4,
        ),
        CriterionDraft(
            label="Fits the audience",
            description="Written for new adult staff and their real first-week situation.",
            max_score=4,
        ),
        CriterionDraft(
            label="Condition and standard",
            description="States under what conditions, and what counts as done correctly.",
            max_score=4,
        ),
        CriterionDraft(
            label="Clear rationale",
            description="Explains why the new wording is better, in 2-3 plain sentences.",
            max_score=3,
        ),
    ],
)


def _practice(scenario: str, brief: str, deliverable: str, rubric: list[tuple[str, str, int]]) -> PracticeDraft:
    return PracticeDraft(
        scenario=scenario,
        brief=brief,
        expected_deliverable=deliverable,
        timebox_minutes=10,
        rubric=[CriterionDraft(label=label, description=desc, max_score=top) for label, desc, top in rubric],
    )


# One fixed task per kind of role, so tasting three sample paths gives three
# different jobs. First matching pattern wins; anything else gets the generic task.
_ROLE_PRACTICES: list[tuple[re.Pattern[str], PracticeDraft]] = [
    (_LEARNING_ROLE, _ID_PRACTICE),
    (
        re.compile(r"trainer|educator|facilitat", re.IGNORECASE),
        _practice(
            "A fictional logistics company is rolling out a new shift-handover app to 60 drivers. You are the trainer "
            "running a 20-minute session at 6 a.m. Several drivers have said they 'don't need another app'.",
            "Write how you would open the session: the first two minutes, word for word, and the one hands-on "
            "exercise you would run. Facts: drivers start their routes at 6:30; most use the app on their phone.",
            "An opening of about 80 words plus one exercise in 2-3 sentences",
            [
                ("Wins the room", "Opens with something the drivers care about, not with the app's features.", 4),
                ("Hands-on early", "Gets people doing something on their own phone within minutes.", 4),
                ("Fits the clock", "Respects the 20 minutes and the 6:30 start.", 3),
            ],
        ),
    ),
    (
        re.compile(r"coordinator|project|program", re.IGNORECASE),
        _practice(
            "You coordinate a fictional nonprofit's spring fundraiser in 3 weeks. The venue just moved the date one "
            "day earlier, the caterer has not confirmed, and two volunteers dropped out.",
            "Write the message you would send to the 5-person organising team today. Facts: 120 guests are "
            "registered; the budget has $400 left; the board chair wants an update by Friday.",
            "One team message of 100-150 words with clear owners and dates",
            [
                ("Clear priorities", "Puts the venue date and caterer first, in that order.", 4),
                ("Owners and dates", "Every action has one named owner and a deadline.", 4),
                ("Calm and brief", "Short enough to read on a phone; no blame.", 3),
            ],
        ),
    ),
    (
        re.compile(r"supply|inventory|planner|logistics", re.IGNORECASE),
        _practice(
            "A fictional home-goods retailer keeps running out of its best-selling lamp. Each store sells about 40 "
            "a week, deliveries take 2 weeks to arrive, and stores reorder only when the shelf is empty.",
            "Write a short note to the store managers: why they keep running out, the reorder point you suggest "
            "with the arithmetic, and one risk of your suggestion.",
            "A note of 100-150 words with the reorder point and how you got it",
            [
                ("Finds the cause", "Explains that ordering at zero leaves 2 weeks with no stock.", 4),
                (
                    "Right arithmetic",
                    "Reorder point covers the 2-week lead time (about 80 lamps) plus a small buffer.",
                    4,
                ),
                ("Names a risk", "Notes a real downside, such as tying up money or space in extra stock.", 3),
            ],
        ),
    ),
    (
        re.compile(r"analyst|informatics|operations", re.IGNORECASE),
        _practice(
            "A fictional clinic chain says patients wait too long. Last month: Monday average wait 34 minutes, "
            "Tuesday to Thursday 18 minutes, Friday 29 minutes. Staffing is the same every day.",
            "Write a short note to the operations manager: what the numbers suggest, one question you would ask "
            "before recommending anything, and one cheap test to try next month.",
            "A note of 100-150 words: finding, one question, one test",
            [
                ("Reads the data", "Spots that Monday and Friday are the problem, not the whole week.", 4),
                (
                    "Asks before solving",
                    "Asks a question that could change the answer (for example appointment volume).",
                    4,
                ),
                ("Testable next step", "Proposes a small, measurable test with a clear success signal.", 4),
            ],
        ),
    ),
]


class DemoWriter:
    async def careers(self, *, resume: str, candidate: Candidate, source: ResumeSource = "cv") -> CareersDraft:
        sample = _sample_id(resume)
        if sample:
            profile, careers = _PATHS[sample]
            return CareersDraft(profile=profile, careers=careers)
        years = re.search(r"(\d{1,2})\s+years?", resume, re.IGNORECASE)
        return CareersDraft(
            profile=ProfileRead(
                current_role=candidate.current_role or "Your current role",
                years_experience=candidate.years_experience or (int(years.group(1)) if years else None),
                industry="Not read in sample mode",
                evidence_note=f"{NOTE}: generic paths, not read from your resume.",
                standout="",
            ),
            careers=_GENERIC,
        )

    async def roadmap(
        self, *, candidate: Candidate, career: Career, track: Track, hours_per_week: float
    ) -> RoadmapDraft:
        role = career.title
        a_role = ("an " if role[:1].lower() in "aeiou" else "a ") + role
        gap = (career.missing_skills[0] if career.missing_skills else f"a core {role} skill").lower()
        strength = (
            career.transferable_skills[0].skill if career.transferable_skills else "your strongest skill"
        ).lower()
        free = "free " if candidate.monthly_learning_budget == 0 else ""
        budget = int(clamp_hours(hours_per_week) * 60)
        share = TRACKS[track].share
        weeks = [
            WeekDraft(
                title="Explore and validate the role",
                objective=f"Check what {role} work really involves and how your experience lines up.",
                tasks=[
                    _task(
                        f"Try a 10-minute {role} practice task",
                        "simulation",
                        10,
                        "A small realistic task shows you what the work feels like before you invest more time.",
                        ["Open the practice task.", "Read the scenario and the rubric first.", "Write a short answer."],
                        "One short answer to a realistic work scenario",
                        "Answer submitted and feedback read for every rubric criterion.",
                    ),
                    _task(
                        f"Analyze 2 {role} job descriptions",
                        "research",
                        30,
                        "Real postings show which requirements repeat, so you study what employers ask for.",
                        [
                            f'Search a job site for "{role}" and open 2 entry-level postings.',
                            "Highlight each requirement that appears in both.",
                        ],
                        "A list of 3 requirements that appear in both postings",
                        "3 requirements written down, each found in both postings.",
                    ),
                    _task(
                        "Map 3 skills you have and 3 you need",
                        "research",
                        30,
                        "Seeing the overlap makes the switch concrete and shows where to focus next week.",
                        ["Use the skills on your career card and the job descriptions.", "Add one proof per skill."],
                        "A 2-column skills matrix",
                        "6 skills listed, and each 'have' skill has one concrete example.",
                    ),
                ],
            ),
            WeekDraft(
                title="Learn one essential skill",
                objective=f"Get a working grasp of {gap}.",
                tasks=[
                    _task(
                        f"Learn the basics of {gap}",
                        "learning",
                        120,
                        "This gap appears most in the role, so it unlocks the rest of the plan.",
                        [f'Search for "{gap} beginner tutorial" and pick one {free}resource.', "Note 5 key terms."],
                        "One page of notes with 5 key terms or steps",
                        "You can explain each of the 5 terms in one sentence without looking.",
                    ),
                    _task(
                        f"Practice {gap} on a small example",
                        "learning",
                        120,
                        "Using a skill once on a real example makes it stick and gives you something to show.",
                        ["Pick one small topic you know well from your current job.", "Apply what you learned."],
                        "One small practice piece (outline, draft or plan)",
                        "The piece uses at least 3 of the terms or steps from your notes.",
                    ),
                ],
            ),
            WeekDraft(
                title="Build demonstrable evidence",
                objective="Turn your existing work into one sample a hiring manager can look at.",
                tasks=[
                    _task(
                        f"Turn one piece of past work into {a_role} sample",
                        "portfolio",
                        150 if track == "fast" else 180,
                        f"Your {strength} is the bridge; showing it in the new format is the strongest evidence.",
                        ["Pick one thing you made that worked.", f"Rewrite it as {a_role} would present it."],
                        "A draft work sample of 1-2 pages",
                        "The sample has a goal, an audience, the content, and how you would check it worked.",
                    ),
                    _task(
                        "Self-review against a simple checklist",
                        "portfolio",
                        60,
                        "Reviewing your own work like an employer would finds the fixes that matter.",
                        ["Check goal, audience, result and readability.", "Fix the two weakest points."],
                        "A revision list of 2-4 fixes, with the fixes made",
                        "At least 2 fixes are visible in the revised sample.",
                    ),
                ],
            ),
            WeekDraft(
                title="Prepare for market entry",
                objective="Package your evidence and start conversations with people in the field.",
                tasks=[
                    _task(
                        "Publish your practice proof page",
                        "portfolio",
                        30,
                        "A public proof page is easy to share in a conversation or an application.",
                        ["Open your graded practice task.", "Add a 2-sentence reflection and publish it."],
                        "A public proof page link",
                        "The page shows the task, your answer, the rubric scores and your reflection.",
                    ),
                    _task(
                        f"Rewrite 3 resume bullets for one {role} posting",
                        "application",
                        60,
                        "Employers scan for their own words; translating your experience gets you past the "
                        "first screen.",
                        [
                            "Pick one posting from week 1.",
                            "Rewrite 3 bullets using its vocabulary. Keep every claim true.",
                        ],
                        "3 rewritten resume bullets",
                        "Each bullet uses at least one term from the posting and states a result.",
                    ),
                    _task(
                        f"Draft messages to 2 people working as {role}",
                        "networking",
                        45 if track == "safe" else 60,
                        "Practitioners can tell you what the job is really like and how they got in.",
                        [f'Search a professional network for "{role}".', "Ask one specific question, 15 minutes."],
                        "2 drafted outreach messages",
                        "Each message is under 100 words and asks one specific question.",
                    ),
                ],
            ),
        ]
        weeks = [w.model_copy(update={"tasks": _scale_week(w.tasks, budget, share)}) for w in weeks]
        return RoadmapDraft(
            weeks=weeks,
            assumptions=[
                f"{NOTE}: a fixed template filled with your chosen role, not an AI plan.",
                "Uses free resources only, because your learning budget is 0."
                if candidate.monthly_learning_budget == 0
                else "Paid resources are optional; nothing here requires them.",
            ],
            cautions=["30 days is a start, not a complete career switch."],
        )

    async def practice(
        self, *, candidate: Candidate, career: Career, task_title: str, task_deliverable: str
    ) -> PracticeDraft:
        for pattern, draft in _ROLE_PRACTICES:
            if pattern.search(career.title):
                return draft
        return PracticeDraft(
            scenario=f"{NOTE}. In your first week as a {career.title}, your manager asks for a short note on one "
            "process from your old job that the new team could learn from.",
            brief="Pick one process you know well. Facts: the team has 6 people, a weekly 30-minute meeting, and no "
            "budget for new tools this quarter. Describe the process and suggest one way the team could try it.",
            expected_deliverable="A note of 100-200 words: the process, why it works, and one way to try it next week",
            timebox_minutes=10,
            rubric=[
                CriterionDraft(
                    label="Clear problem", description="Says which team problem it helps with.", max_score=4
                ),
                CriterionDraft(
                    label="Uses your experience", description="Draws on concrete detail from past work.", max_score=4
                ),
                CriterionDraft(
                    label="Practical next step",
                    description="Suggests a step that fits 6 people, 30 minutes and zero budget.",
                    max_score=4,
                ),
            ],
        )

    async def evaluate(self, *, practice: Practice, answer: str) -> EvaluationDraft:
        words = len(answer.split())
        level = 1 if words < 30 else 2 if words < 70 else 3
        sentences = re.split(r"(?<=[.!?])\s+|\n+", answer.strip())
        # Skip the "SAMPLE ANSWER (...)" label line so the quote shows real content.
        sentence = next((x for x in sentences if len(x.split()) >= 4 and not x.startswith("SAMPLE ANSWER")), "")
        quote = " ".join(sentence.split()[:20])
        return EvaluationDraft(
            criteria=[
                CriterionScoreDraft(
                    rubric_id=c.id,
                    score=min(c.max_score, level),
                    evidence=quote,
                    strengths=[f"{NOTE}: no AI review. Score from answer length only."],
                    improvements=[f'Check your answer against "{c.label}": {c.description}'],
                )
                for c in practice.rubric
            ],
            overall_feedback=f"{NOTE}: this is not real feedback. Live AI feedback scores every rubric criterion.",
            next_revision_step="Reread the rubric and make one change per criterion.",
        )

    async def sample_answer(self, *, practice: Practice, candidate: Candidate) -> str:
        if practice.scenario == _ID_PRACTICE.scenario:
            return (
                "SAMPLE ANSWER (fixed text, not written by you)\n"
                "Objective: By the end of this 15-minute module, new warehouse staff will perform a pre-shift dock "
                "check, setting wheel chocks, locking the dock plate and confirming green lights, with no missed "
                "steps on a supervised practice run.\n"
                'Rationale: "Understand" cannot be observed, so nobody can tell if the training worked. The new '
                "objective names the exact check staff must do before working alone and says what counts as correct."
            )
        return (
            "SAMPLE ANSWER (fixed text, not written by you)\n"
            "In my old job we ran a 5-minute start-of-week check-in where each person named one blocker. It worked "
            "because problems surfaced on Monday instead of Friday.\n"
            "For this team of 6, I would add it to the first 5 minutes of the weekly meeting for one month, with no "
            "new tools. We would track how many blockers are solved within the week."
        )
