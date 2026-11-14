/** Pick lists for the start form. Front-end only: the API still receives plain
 * strings, so a role that is not listed can be typed into the search box and
 * used as is. */

export interface Option {
  value: string;
  label: string;
}

const list = (labels: string[]): Option[] => labels.map((label) => ({ value: label, label }));

/** Common starting points for a career change (US adults 25-45). */
export const CURRENT_ROLES = list([
  "Teacher",
  "Teaching assistant",
  "Nurse",
  "Medical assistant",
  "Pharmacist",
  "Social worker",
  "Retail store manager",
  "Retail sales associate",
  "Customer service representative",
  "Call center agent",
  "Administrative assistant",
  "Office manager",
  "Receptionist",
  "Accountant",
  "Bookkeeper",
  "Bank teller",
  "Sales representative",
  "Real estate agent",
  "Marketing coordinator",
  "Journalist",
  "Paralegal",
  "Lawyer",
  "Hospitality or hotel staff",
  "Restaurant manager",
  "Chef or cook",
  "Warehouse or logistics associate",
  "Truck or delivery driver",
  "Military service member or veteran",
  "Police officer",
  "Firefighter",
  "Fitness trainer",
  "Graphic designer",
  "Software developer",
  "Civil or mechanical engineer",
  "Lab technician",
  "Academic researcher",
  "Recent graduate",
]);

/** Roles people commonly move into without starting over. */
export const TARGET_ROLES = list([
  "Instructional designer",
  "Corporate trainer",
  "Learning and development specialist",
  "Project coordinator",
  "Program manager",
  "Operations specialist",
  "Customer success manager",
  "Account manager",
  "Sales development representative",
  "HR coordinator or recruiter",
  "Business analyst",
  "Data analyst",
  "Health data analyst",
  "Care coordinator",
  "UX researcher",
  "UX designer",
  "Product manager",
  "Marketing specialist",
  "Content writer",
  "Technical writer",
  "Community manager",
  "Policy analyst",
  "Financial analyst",
  "QA tester",
]);

export const HOURS = [2, 3, 5, 8, 10, 15, 20];
export const BUDGETS = [0, 25, 50, 100, 200, 500];
export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "KZT"];
export const MOTIVATIONS = [
  "Higher pay",
  "Less stress",
  "Better work-life balance",
  "More meaningful work",
  "Remote work",
  "Job security",
  "Room to grow",
];
