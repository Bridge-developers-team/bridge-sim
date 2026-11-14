// Fixed skill taxonomy. The AI may only pick skills from this list (with a
// level and a quote from the user's text as evidence). Fit scores and gap hours
// are computed in lib/fit.js from these ids, never by the AI.
//
// Levels: 0 none, 1 coursework or exposure, 2 applied in a real project or job,
// 3 repeated use with a visible result (thesis, publication, measurable outcome).
// hoursPerLevel: rough self-study hours to go up one level (prototype estimate).

export const SKILL_LEVELS = [
  "No evidence",
  "Coursework or exposure",
  "Applied in a real project or job",
  "Repeated use with a visible result",
];

export const SKILLS = [
  { id: "statistics", name: "Statistics & regression", hoursPerLevel: 60 },
  { id: "programming", name: "Programming (Python, R or SQL)", hoursPerLevel: 80 },
  { id: "data_wrangling", name: "Cleaning and organizing data", hoursPerLevel: 40 },
  { id: "machine_learning", name: "Machine learning basics", hoursPerLevel: 120 },
  { id: "visualization", name: "Charts and dashboards", hoursPerLevel: 30 },
  { id: "spreadsheet_modeling", name: "Spreadsheet modeling", hoursPerLevel: 40 },
  { id: "finance_accounting", name: "Finance & accounting basics", hoursPerLevel: 70 },
  { id: "economics", name: "Economic reasoning", hoursPerLevel: 50 },
  { id: "research_design", name: "Research & experiment design", hoursPerLevel: 50 },
  { id: "qualitative_research", name: "Interviews & qualitative research", hoursPerLevel: 40 },
  { id: "writing", name: "Clear professional writing", hoursPerLevel: 30 },
  { id: "presenting", name: "Explaining to non-experts", hoursPerLevel: 25 },
  { id: "policy_institutions", name: "Policy, law & institutions", hoursPerLevel: 50 },
  { id: "healthcare_domain", name: "Healthcare know-how", hoursPerLevel: 80 },
  { id: "education_domain", name: "Teaching & learning design", hoursPerLevel: 50 },
  { id: "people_skills", name: "Coaching, hiring & conflict", hoursPerLevel: 40 },
  { id: "project_coordination", name: "Planning & coordinating work", hoursPerLevel: 30 },
  { id: "customer_relationships", name: "Client & customer relationships", hoursPerLevel: 30 },
  { id: "process_improvement", name: "Process improvement", hoursPerLevel: 40 },
];

export const SKILL_IDS = SKILLS.map((s) => s.id);

export function getSkill(id) {
  return SKILLS.find((s) => s.id === id) ?? null;
}
