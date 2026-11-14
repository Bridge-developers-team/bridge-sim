// Target roles (non-tech switches).
// WARNING: pay, hours and course prices below are SAMPLE PLACEHOLDERS for the
// prototype. They are NOT verified. Before using any number in a pitch, replace
// it with a sourced figure (pay: BLS Occupational Outlook Handbook,
// https://www.bls.gov/ooh/ ; course prices: the provider's own pricing page)
// and set verified: true.

export const ROLES = [
  {
    id: "instructional-designer",
    title: "Instructional Designer",
    blurb: "Designs training and online courses for companies.",
    commonFrom: ["Teacher", "Trainer", "Nurse educator"],
    blsOccupation: "Training and development specialists",
    entryPay: 55000,
    medianPay: 70000,
    baseHours: 220,
    courses: [
      { name: "Online instructional design certificate (example)", price: 600, billing: "once" },
      { name: "E-learning authoring tool licence (example)", price: 0, billing: "once" },
    ],
    verified: false,
  },
  {
    id: "health-data-analyst",
    title: "Health Data Analyst",
    blurb: "Turns clinical and operational data into reports that guide care decisions.",
    commonFrom: ["Nurse", "Medical assistant", "Pharmacy technician"],
    blsOccupation: "Data scientists / health information roles",
    entryPay: 62000,
    medianPay: 85000,
    baseHours: 320,
    courses: [
      { name: "Data analytics certificate, subscription (example)", price: 49, billing: "monthly" },
      { name: "SQL practice platform (example)", price: 0, billing: "once" },
    ],
    verified: false,
  },
  {
    id: "project-manager",
    title: "Project Manager",
    blurb: "Plans work, people and deadlines so projects ship on time.",
    commonFrom: ["Retail manager", "Event planner", "Military", "Teacher"],
    blsOccupation: "Project management specialists",
    entryPay: 60000,
    medianPay: 98000,
    baseHours: 200,
    courses: [
      { name: "Project management certificate, subscription (example)", price: 49, billing: "monthly" },
      { name: "Entry-level PM certification exam fee (example)", price: 300, billing: "once" },
    ],
    verified: false,
  },
  {
    id: "hr-specialist",
    title: "HR / People Operations Specialist",
    blurb: "Hires, onboards and supports employees; handles policy and people issues.",
    commonFrom: ["Retail manager", "Teacher", "Office manager"],
    blsOccupation: "Human resources specialists",
    entryPay: 48000,
    medianPay: 67000,
    baseHours: 160,
    courses: [{ name: "HR fundamentals certificate (example)", price: 400, billing: "once" }],
    verified: false,
  },
  {
    id: "customer-success-manager",
    title: "Customer Success Manager",
    blurb: "Keeps business customers happy, renewing and growing.",
    commonFrom: ["Hospitality", "Retail", "Teacher", "Nurse"],
    blsOccupation: "Customer service / account management roles",
    entryPay: 55000,
    medianPay: 80000,
    baseHours: 120,
    courses: [{ name: "Customer success course (example)", price: 300, billing: "once" }],
    verified: false,
  },
  {
    id: "operations-analyst",
    title: "Operations Analyst",
    blurb: "Finds where a business loses time and money and fixes the process.",
    commonFrom: ["Logistics", "Retail manager", "Restaurant manager"],
    blsOccupation: "Management analysts / operations research analysts",
    entryPay: 58000,
    medianPay: 83000,
    baseHours: 240,
    courses: [
      { name: "Business analytics certificate, subscription (example)", price: 49, billing: "monthly" },
    ],
    verified: false,
  },
];

export function getRole(id) {
  return ROLES.find((r) => r.id === id) ?? null;
}
