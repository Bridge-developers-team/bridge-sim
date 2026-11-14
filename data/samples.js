// SAMPLE profiles for demo use. Fictional people, schools named generically,
// employers marked fictional. track: "changer" (working adult) or "graduate".

export const SAMPLES = [
  {
    id: "teacher",
    track: "changer",
    interests: "",
    label: "Sample: Middle-school teacher",
    suggestedRole: "instructional-designer",
    resume: `Maria Lopez (SAMPLE)
Middle-school science teacher, 8 years
Riverside, CA

Experience
- 7th and 8th grade science teacher, Lincoln Middle School (fictional) (2018-present)
  - Teach 5 classes (~140 students) per year; rewrote the district's 7th grade ecology unit around hands-on labs.
  - Built a Google Classroom course library used by 6 teachers during remote learning.
  - Lead new-teacher mentoring for the science department (3 mentees per year).
  - Analyze state test results each fall and plan reteaching for weak standards.
- Substitute teacher, local school district (2016-2018)

Education
- B.S. Biology, UC Riverside
- California Single Subject Teaching Credential, Science

Skills
- Lesson and unit design, formative assessment, classroom technology (Google Classroom, Kahoot, Canva), parent communication`,
  },
  {
    id: "nurse",
    track: "changer",
    interests: "",
    label: "Sample: ICU nurse",
    suggestedRole: "health-data-analyst",
    resume: `James Carter, RN (SAMPLE)
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
- Clinical assessment, Epic charting, Excel (pivot tables, basic charts), quality-improvement projects, patient and family communication`,
  },
  {
    id: "retail",
    track: "changer",
    interests: "",
    label: "Sample: Retail store manager",
    suggestedRole: "operations-analyst",
    resume: `Aisha Thompson (SAMPLE)
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
- Scheduling and labor budgets, inventory and shrink, hiring and coaching, weekly sales reporting, conflict resolution`,
  },
  {
    id: "polisci",
    track: "graduate",
    label: "Sample: Political science BA (quant)",
    suggestedRole: "risk-analyst",
    interests: "finance or machine learning",
    resume: `Daniel Kim (SAMPLE)
B.A. Political Science, minor in Statistics, state university, May 2026. GPA 3.6

Senior thesis: "Do local job losses move turnout?" Built a county-level panel (2008-2024) from Census and election data and estimated fixed-effects regressions in R. Found a 1.2-point turnout drop per 10% manufacturing job loss; presented at the undergraduate research symposium.

Relevant courses: Quantitative Political Analysis, Regression Models, Game Theory, Comparative Political Economy, Intro to Python for Social Science.

Experience
- Research assistant, comparative politics lab (2024-2026): cleaned and merged survey waves of 6,000 respondents, wrote codebooks, made charts for two working papers.
- Debate team captain: organized weekly practice for 14 members and travel to 5 tournaments.
- Since graduation: part-time barista while applying; 70+ applications to policy jobs, 2 interviews.

Skills: R (tidyverse, fixest), basic Python (pandas), Excel, Stata, survey weighting, academic writing.`,
  },
  {
    id: "psych",
    track: "graduate",
    label: "Sample: Psychology BA",
    suggestedRole: "ux-researcher",
    interests: "UX or marketing",
    resume: `Priya Shah (SAMPLE)
B.A. Psychology, liberal arts college, December 2025

Honors project: designed and ran an online experiment (n=212) on how choice overload affects decision time; preregistered hypotheses, analyzed with t-tests and ANOVA in SPSS.

Relevant courses: Research Methods, Cognitive Psychology, Social Psychology, Statistics for Behavioral Science, Human-Computer Interaction (elective).

Experience
- Peer mentor, first-year advising center (2023-2025): ran 1:1 check-ins with 25 students per term and wrote summary notes for advisors.
- Interviewed 15 students for a campus dining satisfaction study and coded the transcripts into themes for the dining office report.
- Since graduation: temp receptionist at a dental office.

Skills: SPSS, Qualtrics, Excel, interviewing, APA-style writing, Canva.`,
  },
  {
    id: "biology",
    track: "graduate",
    label: "Sample: Biology MS",
    suggestedRole: "health-data-analyst",
    interests: "health data or consulting",
    resume: `Marcus Johnson (SAMPLE)
M.S. Biology, public research university, August 2025. B.S. Biology, 2023

Master's thesis: effects of temperature on gene expression in zebrafish; ran qPCR experiments, analyzed results with mixed-effects models in R, wrote a 60-page thesis.

Experience
- Teaching assistant, Intro Biology lab (2023-2025): taught 3 lab sections of 24 students, graded reports, held office hours.
- Lab volunteer, county public health department (summer 2024): entered and checked case data for a foodborne illness investigation; made weekly charts for the epidemiologist.
- Since graduation: applying to lab tech and pharma jobs; considering leaving the bench.

Skills: R, Excel, experimental design, scientific writing, basic SQL (one online course).`,
  },
];
