// DEMO / SAMPLE DATA ONLY. Used when no API key is set (demo mode), or when
// the user asks for labeled sample data after an AI error. Nothing here is AI
// output: career paths come from keyword matching or a hand-written set for
// the fictitious teacher, roadmaps and practice tasks from fixed templates,
// and "feedback" from answer length. The UI labels all of it.
import { ROLES } from "../data/roles.js";
import { SKILLS, SKILL_IDS } from "../data/skills.js";
import { verifySkills, levelMap, rankRoles } from "../lib/fit.js";
import { TRACK_INFO, clampHours } from "../lib/roadmap.js";

const NOTE = "Sample data (not AI)";

// ---------- career paths ----------

// Hand-written set for teacher profiles (the brief's demo persona). Quotes are
// verbatim from the fictitious teacher sample, so they pass the quote check.
const TEACHER_CAREERS = [
  {
    title: "Instructional Designer",
    roleSummary: "Designs training and online courses that help employees learn specific job skills.",
    fitExplanation:
      "You already plan whole units from standards to assessment and turned a writing unit into self-paced lessons, which is the core loop of instructional design.",
    transferableSkills: [
      { skill: "Unit and lesson design", evidence: "plan every unit from state standards to final assessment" },
      { skill: "Self-paced learning design", evidence: "Redesigned the 7th grade persuasive-writing unit into short self-paced lessons with checklists" },
      { skill: "Assessment and rubrics", evidence: "Write rubrics and quick formative checks" },
    ],
    missingSkills: ["E-learning authoring tools", "Storyboarding modules", "Adult learning in the workplace", "Working with subject-matter experts"],
    relativeEffort: "lower",
    keyTradeoff: "Many roles are remote and project-based, so you trade classroom contact for screen time and stakeholder reviews.",
    assumptions: ["Assumes you want to keep building learning experiences, not leave education work entirely."],
  },
  {
    title: "Corporate Trainer",
    roleSummary: "Runs live training sessions for employees on skills, tools or company processes.",
    fitExplanation:
      "You present to groups every day and already run professional-development sessions for colleagues, so facilitation transfers directly.",
    transferableSkills: [
      { skill: "Facilitating adult sessions", evidence: "Lead two 45-minute professional-development sessions per year for colleagues on giving feedback" },
      { skill: "Presenting to groups", evidence: "presenting to groups" },
      { skill: "Checking for understanding", evidence: "review results every two weeks and reteach where students struggle" },
    ],
    missingSkills: ["Training needs analysis", "Measuring training impact for a business", "Business-specific content"],
    relativeEffort: "medium",
    keyTradeoff: "Often involves travel or long days of delivery, and you teach content chosen by the business, not by you.",
    assumptions: ["Assumes you enjoy the live, in-the-room part of teaching."],
  },
  {
    title: "Education Project Coordinator",
    roleSummary: "Keeps education programs on track: schedules, people, budgets and communication.",
    fitExplanation:
      "You already coordinate a yearly event with volunteers and 120 families and keep a shared lesson library running for other teachers.",
    transferableSkills: [
      { skill: "Event and schedule coordination", evidence: "Coordinate the yearly 8th grade showcase: schedule, volunteers, communication with 120 families" },
      { skill: "Shared resource management", evidence: "Built and maintain the department's shared Google Classroom library of 40+ lessons" },
    ],
    missingSkills: ["Project management workflows", "Budget tracking", "Project tools such as task boards"],
    relativeEffort: "medium",
    keyTradeoff: "More operations and less teaching; you may miss designing the learning itself.",
    assumptions: ["Assumes you are comfortable moving from teaching to organizing other people's work."],
  },
];

// Demo skill map: keyword matching only, NOT AI. Evidence is the sentence that
// contains the keyword, so the code-side quote check passes.
const KEYWORDS = {
  statistics: ["regression", "statistic", "anova", "t-test", "fixed-effects", "mixed-effects", "stata", "spss"],
  programming: ["python", " r ", "in r", "sql", "pandas", "tidyverse"],
  data_wrangling: ["cleaned", "merged", "data entry", "entered and checked", "dataset", "panel"],
  machine_learning: ["machine learning", "random forest", "neural", "classifier"],
  visualization: ["chart", "dashboard", "tableau", "graph"],
  spreadsheet_modeling: ["excel", "spreadsheet", "pivot"],
  finance_accounting: ["accounting", "finance", "budget", "valuation", "$"],
  economics: ["economic", "game theory", "political economy"],
  research_design: ["experiment", "preregistered", "research", "study", "survey"],
  qualitative_research: ["interview", "coded the transcripts", "themes", "focus group"],
  writing: ["wrote", "thesis", "op-ed", "writing", "report"],
  presenting: ["presented", "taught", "trained", "symposium", "debate", "presenting"],
  policy_institutions: ["political", "policy", "government", "public health", "election"],
  healthcare_domain: ["nurse", "patient", "clinical", "icu", "health"],
  education_domain: ["teacher", "taught", "lesson", "curriculum", "students"],
  people_skills: ["mentor", "coaching", "hiring", "team members", "advising"],
  project_coordination: ["organized", "led ", "coordinated", "coordinate", "rollout", "schedule"],
  customer_relationships: ["customer", "client", "family communication", "parent communication"],
  process_improvement: ["reduced", "cut overtime", "reorganization", "improved", "workflow"],
};
const ACTION = /(thesis|built|ran |designed|led |cleaned|analy[sz]ed|wrote|presented|taught|trained|reduced|cut )/i;

function keywordSkills(resume) {
  const sentences = String(resume).split(/(?<=[.!?;])\s+|\n+/).map((x) => x.replace(/^[-•\s]+/, "").trim()).filter((x) => x.split(/\s+/).length >= 4);
  const skills = [];
  for (const [id, words] of Object.entries(KEYWORDS)) {
    const hit = sentences.find((sen) => words.some((w) => (" " + sen.toLowerCase() + " ").includes(w)));
    if (hit) skills.push({ id, level: ACTION.test(hit) ? 2 : 1, evidence: hit.split(/\s+/).slice(0, 20).join(" ") });
  }
  return verifySkills(resume, skills, SKILL_IDS);
}

const skillName = (id) => SKILLS.find((s) => s.id === id)?.name ?? id;

function firstLine(resume) {
  return (
    String(resume)
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !/^sample profile/i.test(l) && l.split(/\s+/).length >= 2) ?? ""
  ).slice(0, 80);
}

export function demoCareers({ resume, profile }) {
  const isTeacher = /\b(teacher|teaching|lesson|classroom)\b/i.test(resume);
  const yearsMatch = String(resume).match(/(\d{1,2})\s+years?/i);
  const out = {
    profile: {
      currentRole: profile?.currentRole || firstLine(resume) || "Your current role",
      yearsExperience: profile?.yearsExperience ?? (yearsMatch ? Number(yearsMatch[1]) : null),
      industry: isTeacher ? "K-12 education" : "Not read in sample mode",
      evidenceNote: `${NOTE}: ${isTeacher ? "hand-written paths for the sample teacher profile" : "paths picked by keyword matching against a fixed role list"}. Add an API key for a real AI reading.`,
    },
  };
  if (isTeacher) return { ...out, careers: TEACHER_CAREERS };

  const skills = keywordSkills(resume);
  const ranking = rankRoles(ROLES, levelMap(skills), SKILLS, (profile?.interestedRoles ?? []).join(" ")).slice(0, 3);
  out.careers = ranking.map((r, i) => {
    const role = ROLES.find((x) => x.id === r.roleId);
    const matched = r.matched.map((m) => skills.find((s) => s.id === m.skill)).filter(Boolean);
    return {
      title: role.title,
      roleSummary: role.blurb,
      fitExplanation: matched.length
        ? `${NOTE}: your text mentions skills this role uses, such as ${matched.slice(0, 2).map((s) => skillName(s.id).toLowerCase()).join(" and ")}.`
        : `${NOTE}: little keyword overlap was found, so treat this path as a weak guess.`,
      transferableSkills: matched.slice(0, 4).map((s) => ({ skill: skillName(s.id), evidence: s.evidence })),
      missingSkills: r.gaps.slice(0, 4).map((g) => skillName(g.skill)),
      relativeEffort: i === 0 ? "lower" : r.fit >= 40 ? "medium" : "higher",
      keyTradeoff: `${NOTE}: no trade-off analysis without the AI.`,
      assumptions: ["Keyword matching only; it cannot judge what you enjoy or how strong each skill is."],
    };
  });
  return out;
}

// ---------- roadmap template ----------

function t(title, type, estimatedMinutes, whyThisMatters, instructions, deliverable, successCriteria) {
  return { title, type, estimatedMinutes, whyThisMatters, instructions, deliverable, successCriteria };
}

// Scales a week's tasks down so the week uses about `share` of the time.
function scaleWeek(tasks, budgetMinutes, share) {
  const total = tasks.reduce((s, x) => s + x.estimatedMinutes, 0);
  const goal = Math.floor(budgetMinutes * share);
  if (total <= goal) return tasks;
  const f = goal / total;
  return tasks.map((x, i) =>
    i === 0 && x.type === "simulation" ? x : { ...x, estimatedMinutes: Math.max(10, Math.floor((x.estimatedMinutes * f) / 5) * 5) },
  );
}

export function demoRoadmap({ career, track, hoursPerWeek, budget = 0 }) {
  const role = career.title;
  const aRole = (/^[aeiou]/i.test(role) ? "an " : "a ") + role;
  const gap = career.missingSkills?.[0] ?? `a core ${role} skill`;
  const strength = career.transferableSkills?.[0]?.skill ?? "your strongest existing skill";
  const free = budget === 0 ? "free " : "";
  const budgetMin = clampHours(hoursPerWeek) * 60;
  const share = TRACK_INFO[track]?.share ?? 0.9;

  const weeks = [
    {
      title: "Explore and validate the role",
      objective: `Check what ${role} work really involves and how your experience lines up.`,
      tasks: [
        t(
          `Try a 10-minute ${role} practice task`,
          "simulation",
          10,
          "A small realistic task shows you what the work feels like before you invest more time.",
          ["Open the practice task.", "Read the scenario and the rubric first.", "Write a short answer; it does not need to be perfect."],
          "One short answer to a realistic work scenario",
          "Answer submitted and feedback read for every rubric criterion.",
        ),
        t(
          `Analyze 2 ${role} job descriptions`,
          "research",
          30,
          "Real postings show which requirements repeat, so you study what employers ask for.",
          [`Search a job site for "${role}" and open 2 entry-level postings.`, "Highlight each requirement that appears in both.", "Note any tool names you have not used."],
          "A list of 3 requirements that appear in both postings",
          "3 requirements written down, each found in both postings.",
        ),
        t(
          "Map 3 skills you have and 3 you need",
          "research",
          30,
          "Seeing the overlap makes the switch concrete and shows where to focus next week.",
          ["Use the skills on your career card and the job descriptions.", "Write one line of proof from your past work next to each skill you have."],
          "A 2-column skills matrix: 3 skills you have (with proof), 3 to build",
          "6 skills listed, and each 'have' skill has one concrete example.",
        ),
      ],
    },
    {
      title: "Learn one essential skill",
      objective: `Get a working grasp of ${gap.toLowerCase()}.`,
      tasks: [
        t(
          `Learn the basics of ${gap.toLowerCase()}`,
          "learning",
          120,
          "This is the gap that appears most in the role, so it unlocks the rest of the plan.",
          [`Search for "${gap} beginner tutorial" and pick one ${free}resource.`, "Take notes on the 5 terms or steps that come up most."],
          "One page of notes with 5 key terms or steps",
          "You can explain each of the 5 terms in one sentence without looking.",
        ),
        t(
          `Practice ${gap.toLowerCase()} on a small example`,
          "learning",
          120,
          "Using a skill once on a real example makes it stick and gives you something to show.",
          ["Pick one small topic you know well from your current job.", `Apply what you learned about ${gap.toLowerCase()} to it.`],
          "One small practice piece (outline, draft or plan)",
          "The piece uses at least 3 of the terms or steps from your notes.",
        ),
      ],
    },
    {
      title: "Build demonstrable evidence",
      objective: "Turn your existing work into one sample a hiring manager can look at.",
      tasks: [
        t(
          `Turn one piece of past work into ${aRole} sample`,
          "portfolio",
          track === "fast" ? 150 : 180,
          `Your ${strength.toLowerCase()} is the bridge; showing it in the new format is the strongest evidence.`,
          ["Pick one thing you made in your current job that worked.", `Rewrite it as ${aRole} would present it, for a workplace audience.`, "Remove any real names or private details."],
          "A draft work sample of 1-2 pages",
          "The sample has a goal, an audience, the content, and how you would check it worked.",
        ),
        t(
          "Self-review against a simple checklist",
          "portfolio",
          60,
          "Reviewing your own work like an employer would is how you find the fixes that matter.",
          ["Check: clear goal? right audience? measurable result? easy to scan?", "Fix the two weakest points."],
          "A revision list of 2-4 fixes, with the fixes made",
          "At least 2 fixes are visible in the revised sample.",
        ),
        ...(track === "fast"
          ? [
              t(
                "Send 1 application to an adjacent role",
                "application",
                60,
                "Fast Track starts testing the market early to learn what gets a response.",
                ["Pick one posting that matches at least half of your skills matrix.", "Adapt your resume summary to it and apply."],
                "One submitted application",
                "Application sent, with the posting saved for follow-up.",
              ),
            ]
          : []),
      ],
    },
    {
      title: "Prepare for market entry",
      objective: "Package your evidence and start conversations with people in the field.",
      tasks: [
        t(
          "Export your practice case study",
          "portfolio",
          45,
          "A tidy one-page case study is easy to share in a conversation or an application.",
          ["Open the case study page from your practice task.", "Add a 2-sentence reflection, then download or print it."],
          "A one-page case study file",
          "The file shows the task, your answer, and your reflection.",
        ),
        t(
          `Rewrite 3 resume bullets for one ${role} posting`,
          "application",
          60,
          "Employers scan for their own words; translating your experience gets you past the first screen.",
          ["Pick one posting from week 1.", "Rewrite 3 bullets from your current job using its vocabulary.", "Keep every claim true."],
          "3 rewritten resume bullets",
          "Each bullet uses at least one term from the posting and states a result.",
        ),
        t(
          `Draft messages to 2 ${role}s for short informational chats`,
          "networking",
          track === "safe" ? 45 : 60,
          "Practitioners can tell you what the job is really like and how they got in.",
          [`Search a professional network for "${role}" plus your current field.`, "Write a short message: who you are, one specific question, a 15-minute ask."],
          "2 drafted outreach messages",
          "Each message is under 100 words and asks one specific question.",
        ),
      ],
    },
  ].map((w) => ({ ...w, tasks: scaleWeek(w.tasks, budgetMin, share) }));

  return {
    weeks,
    assumptions: [
      `${NOTE}: a fixed template filled with your chosen role, not an AI plan.`,
      budget === 0 ? "Uses free resources only, because your learning budget is 0." : "Paid resources are optional; nothing here requires them.",
    ],
    cautions: ["30 days is a start, not a complete career switch."],
  };
}

// ---------- practice task ----------

const ID_SIMULATION = {
  scenario:
    "A fictional regional delivery company is onboarding 40 new warehouse staff each month. Their old safety training says: 'Employees will understand the loading-dock safety rules.' The training manager asks you, the new instructional designer, to fix this objective before the module is rebuilt.",
  brief:
    "Rewrite the objective so it is measurable and fits adult learners in their first week. Facts: the module is 15 minutes long; staff must be able to do a pre-shift dock check (wheel chocks set, dock plate locked, lights green) before they work alone. Then explain your change in 2-3 sentences.",
  expectedDeliverable: "One learning objective plus 2-3 sentences of rationale",
  timeboxMinutes: 10,
  rubric: [
    { label: "Measurable action", description: "Uses an observable verb (e.g. perform, check, identify) instead of 'understand'.", maxScore: 4 },
    { label: "Fits the audience", description: "Written for new adult staff and their real first-week situation.", maxScore: 4 },
    { label: "Condition and standard", description: "States when or under what conditions, and what counts as done correctly.", maxScore: 4 },
    { label: "Clear rationale", description: "Explains why the new wording is better, in 2-3 plain sentences.", maxScore: 3 },
  ],
};

export function demoSimulation({ career }) {
  if (/instruct|learning|training|trainer/i.test(career.title)) return ID_SIMULATION;
  return {
    scenario: `${NOTE}. In your first week as a ${career.title}, your manager asks for a short note on one process from your old job that the new team could learn from.`,
    brief: "Pick one process you know well. Facts: the team has 6 people, a weekly 30-minute meeting, and no budget for new tools this quarter. Describe the process and suggest one way the team could try it.",
    expectedDeliverable: "A note of 100-200 words: the process, why it works, and one way to try it next week",
    timeboxMinutes: 10,
    rubric: [
      { label: "Clear problem", description: "Says which team problem the process would help with.", maxScore: 4 },
      { label: "Uses your experience", description: "Draws on concrete detail from your past work.", maxScore: 4 },
      { label: "Practical next step", description: "Suggests a step that fits the 6 people, 30 minutes and zero budget.", maxScore: 4 },
    ],
  };
}

function firstSentence(answer) {
  const s = String(answer).trim().split(/(?<=[.!?])\s+|\n+/).find((x) => x.trim().split(/\s+/).length >= 4);
  return s ? s.trim().split(/\s+/).slice(0, 20).join(" ") : "";
}

// Length heuristic only; labeled in every string.
export function demoEvaluate({ answer, simulation }) {
  const words = String(answer).trim().split(/\s+/).filter(Boolean).length;
  const evidence = firstSentence(answer);
  return {
    criteria: simulation.rubric.map((c) => ({
      rubricId: c.id,
      score: Math.min(c.maxScore, words < 30 ? 1 : words < 70 ? 2 : 3),
      evidence,
      strengths: [`${NOTE}: no AI review. Score from answer length only.`],
      improvements: [`Check your answer against "${c.label}": ${c.description}`],
    })),
    overallFeedback: `${NOTE}: this is not real feedback. Add an ANTHROPIC_API_KEY to get criterion-level AI practice feedback.`,
    nextRevisionStep: "Reread the rubric and make one change per criterion.",
  };
}

export function demoSampleAnswer({ simulation }) {
  if (simulation.scenario === ID_SIMULATION.scenario) {
    return `SAMPLE ANSWER (fixed text, not written by you)
Objective: By the end of this 15-minute module, new warehouse staff will perform a pre-shift dock check, setting wheel chocks, locking the dock plate and confirming green lights, with no missed steps on a supervised practice run.
Rationale: "Understand" cannot be observed, so nobody can tell if the training worked. The new objective names the exact check staff must do before working alone and says what counts as correct. It is short enough for a first-week module.`;
  }
  return `SAMPLE ANSWER (fixed text, not written by you)
In my old job we ran a 5-minute start-of-week check-in where each person named one blocker. It worked because problems surfaced on Monday instead of Friday.
For this team of 6, I would add it to the first 5 minutes of the weekly meeting for one month, with no new tools. We would track how many blockers are solved within the week.`;
}
