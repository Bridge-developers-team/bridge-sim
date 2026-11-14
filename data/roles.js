// Curated target roles.
// `needs`: skills the role expects at entry level, with target level (1-3) and
// weight. Scored by lib/fit.js.
// `tags`: words matched against the user's "curious about" text (plain code).
//
// Used only in demo mode (no API key) to pick 3 paths with plain code. No pay,
// course prices or durations live here: Bridge never shows invented figures.
// The skill needs are a first draft to review with people in each role.

export const ROLES = [
  {
    id: "financial-analyst",
    title: "Financial Analyst",
    blurb: "Builds models and reports that guide budgets, investments and deals.",
    commonFrom: ["Economics", "Political science", "Math", "Accounting"],
    tags: ["finance", "financial", "investment", "banking", "fp&a", "valuation", "markets"],
    needs: [
      { skill: "spreadsheet_modeling", level: 3, weight: 3 },
      { skill: "finance_accounting", level: 2, weight: 3 },
      { skill: "statistics", level: 1, weight: 1 },
      { skill: "economics", level: 2, weight: 1 },
      { skill: "writing", level: 2, weight: 1 },
      { skill: "presenting", level: 2, weight: 1 },
    ],
  },
  {
    id: "risk-analyst",
    title: "Credit / Risk Analyst",
    blurb: "Uses data and judgment to measure who might default and what could go wrong.",
    commonFrom: ["Economics", "Political science", "Statistics", "Psychology"],
    tags: ["risk", "credit", "finance", "bank", "insurance", "quantitative", "quant"],
    needs: [
      { skill: "statistics", level: 3, weight: 3 },
      { skill: "spreadsheet_modeling", level: 2, weight: 2 },
      { skill: "finance_accounting", level: 2, weight: 2 },
      { skill: "programming", level: 1, weight: 1 },
      { skill: "writing", level: 2, weight: 1 },
    ],
  },
  {
    id: "data-scientist",
    title: "Data Scientist / ML Analyst (entry)",
    blurb: "Builds predictive models and turns data into decisions.",
    commonFrom: ["Political science (quant)", "Economics", "Physics", "Psychology"],
    tags: ["machine learning", "ml", "ai", "data science", "data scientist", "prediction", "model", "python"],
    needs: [
      { skill: "statistics", level: 3, weight: 3 },
      { skill: "programming", level: 2, weight: 3 },
      { skill: "machine_learning", level: 2, weight: 2 },
      { skill: "data_wrangling", level: 2, weight: 2 },
      { skill: "research_design", level: 2, weight: 1 },
      { skill: "presenting", level: 1, weight: 1 },
    ],
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    blurb: "Answers business questions with data, SQL and clear charts.",
    commonFrom: ["Any quantitative major", "Social sciences", "Business"],
    tags: ["data", "analytics", "analyst", "sql", "dashboard", "tableau", "excel"],
    needs: [
      { skill: "data_wrangling", level: 2, weight: 3 },
      { skill: "programming", level: 2, weight: 2 },
      { skill: "statistics", level: 2, weight: 2 },
      { skill: "visualization", level: 2, weight: 2 },
      { skill: "presenting", level: 2, weight: 1 },
    ],
  },
  {
    id: "policy-analyst",
    title: "Policy Analyst",
    blurb: "Researches problems and writes recommendations for government, nonprofits or companies.",
    commonFrom: ["Political science", "Public policy", "Economics", "Law"],
    tags: ["policy", "government", "public", "nonprofit", "think tank", "regulation", "politics"],
    needs: [
      { skill: "policy_institutions", level: 3, weight: 3 },
      { skill: "writing", level: 3, weight: 3 },
      { skill: "research_design", level: 2, weight: 2 },
      { skill: "statistics", level: 1, weight: 1 },
      { skill: "presenting", level: 2, weight: 1 },
    ],
  },
  {
    id: "market-research-analyst",
    title: "Market Research Analyst",
    blurb: "Finds out what customers want using surveys, interviews and data.",
    commonFrom: ["Psychology", "Sociology", "Marketing", "Political science"],
    tags: ["marketing", "market research", "consumer", "survey", "brand", "insights"],
    needs: [
      { skill: "research_design", level: 2, weight: 3 },
      { skill: "statistics", level: 2, weight: 2 },
      { skill: "qualitative_research", level: 2, weight: 2 },
      { skill: "presenting", level: 2, weight: 2 },
      { skill: "spreadsheet_modeling", level: 1, weight: 1 },
    ],
  },
  {
    id: "ux-researcher",
    title: "UX Researcher",
    blurb: "Studies how people use products and turns findings into design changes.",
    commonFrom: ["Psychology", "Anthropology", "Sociology", "Teacher"],
    tags: ["ux", "user research", "design", "product", "usability", "human"],
    needs: [
      { skill: "qualitative_research", level: 3, weight: 3 },
      { skill: "research_design", level: 2, weight: 2 },
      { skill: "writing", level: 2, weight: 1 },
      { skill: "presenting", level: 2, weight: 2 },
      { skill: "statistics", level: 1, weight: 1 },
    ],
  },
  {
    id: "instructional-designer",
    title: "Instructional Designer",
    blurb: "Designs training and online courses for companies.",
    commonFrom: ["Teacher", "Education", "Psychology"],
    tags: ["training", "learning", "education", "course", "teaching", "e-learning"],
    needs: [
      { skill: "education_domain", level: 3, weight: 3 },
      { skill: "writing", level: 2, weight: 2 },
      { skill: "project_coordination", level: 2, weight: 1 },
      { skill: "presenting", level: 2, weight: 1 },
      { skill: "research_design", level: 1, weight: 1 },
    ],
  },
  {
    id: "health-data-analyst",
    title: "Health Data Analyst",
    blurb: "Turns clinical and operational data into reports that guide care decisions.",
    commonFrom: ["Nurse", "Public health", "Biology"],
    tags: ["health", "healthcare", "clinical", "hospital", "public health", "medical"],
    needs: [
      { skill: "healthcare_domain", level: 2, weight: 2 },
      { skill: "data_wrangling", level: 2, weight: 2 },
      { skill: "statistics", level: 2, weight: 2 },
      { skill: "programming", level: 1, weight: 1 },
      { skill: "visualization", level: 2, weight: 1 },
    ],
  },
  {
    id: "project-manager",
    title: "Project Manager",
    blurb: "Plans work, people and deadlines so projects ship on time.",
    commonFrom: ["Retail manager", "Event planner", "Military", "Any major"],
    tags: ["project", "management", "operations", "coordination", "pm"],
    needs: [
      { skill: "project_coordination", level: 3, weight: 3 },
      { skill: "people_skills", level: 2, weight: 2 },
      { skill: "presenting", level: 2, weight: 1 },
      { skill: "writing", level: 2, weight: 1 },
      { skill: "spreadsheet_modeling", level: 1, weight: 1 },
    ],
  },
  {
    id: "hr-specialist",
    title: "HR / People Operations Specialist",
    blurb: "Hires, onboards and supports employees; handles policy and people issues.",
    commonFrom: ["Retail manager", "Psychology", "Teacher"],
    tags: ["hr", "human resources", "people", "recruiting", "talent"],
    needs: [
      { skill: "people_skills", level: 3, weight: 3 },
      { skill: "writing", level: 2, weight: 1 },
      { skill: "policy_institutions", level: 1, weight: 1 },
      { skill: "project_coordination", level: 2, weight: 1 },
    ],
  },
  {
    id: "operations-analyst",
    title: "Operations Analyst",
    blurb: "Finds where a business loses time and money and fixes the process.",
    commonFrom: ["Retail manager", "Logistics", "Engineering", "Economics"],
    tags: ["operations", "process", "supply chain", "logistics", "efficiency"],
    needs: [
      { skill: "process_improvement", level: 3, weight: 3 },
      { skill: "spreadsheet_modeling", level: 2, weight: 2 },
      { skill: "data_wrangling", level: 2, weight: 1 },
      { skill: "statistics", level: 1, weight: 1 },
      { skill: "presenting", level: 2, weight: 1 },
    ],
  },
  {
    id: "customer-success-manager",
    title: "Customer Success Manager",
    blurb: "Keeps business customers happy, renewing and growing.",
    commonFrom: ["Hospitality", "Retail", "Teacher", "Communications"],
    tags: ["customer", "client", "account", "success", "saas", "sales"],
    needs: [
      { skill: "customer_relationships", level: 3, weight: 3 },
      { skill: "presenting", level: 2, weight: 2 },
      { skill: "project_coordination", level: 2, weight: 1 },
      { skill: "data_wrangling", level: 1, weight: 1 },
    ],
  },
];

export function getRole(id) {
  return ROLES.find((r) => r.id === id) ?? null;
}
