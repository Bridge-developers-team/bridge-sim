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
/** Monthly learning budget steps, in round amounts of each currency. Every
 * currency has the same number of steps, roughly the same value at each step
 * (step 3 is about 100 USD), so switching currency keeps the user's choice. */
export const BUDGETS = {
  USD: [0, 25, 50, 100, 200, 500],
  EUR: [0, 25, 50, 100, 200, 500],
  GBP: [0, 20, 40, 80, 150, 400],
  CAD: [0, 35, 70, 140, 275, 700],
  AUD: [0, 40, 75, 150, 300, 750],
  KZT: [0, 10_000, 25_000, 50_000, 100_000, 250_000],
} as const satisfies Record<string, readonly number[]>;
export type Currency = keyof typeof BUDGETS;
export const CURRENCIES = Object.keys(BUDGETS) as Currency[];

export function budgetSteps(currency: string): readonly number[] {
  return currency in BUDGETS ? BUDGETS[currency as Currency] : BUDGETS.USD;
}

/** The same step in the new currency. An amount that is not a step snaps to
 * the nearest step below it. */
export function convertBudget(amount: number, from: string, to: string): number {
  const steps = budgetSteps(from);
  let step = 0;
  steps.forEach((value, i) => {
    if (amount >= value) step = i;
  });
  return budgetSteps(to)[step] ?? 0;
}

export function budgetLabel(amount: number, currency: string): string {
  return amount === 0 ? "Free resources only" : `${amount.toLocaleString("en-US")} ${currency} a month`;
}
export const MOTIVATIONS = [
  "Higher pay",
  "Less stress",
  "Better work-life balance",
  "More meaningful work",
  "Remote work",
  "Job security",
  "Room to grow",
];

/** Large US metros first (the hackathon market), then other big job markets.
 * Any other city can be typed into the search box. */
export const CITIES = list([
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Dallas, TX",
  "Austin, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Diego, CA",
  "San Francisco, CA",
  "San Jose, CA",
  "Seattle, WA",
  "Denver, CO",
  "Boston, MA",
  "Atlanta, GA",
  "Miami, FL",
  "Orlando, FL",
  "Washington, DC",
  "Nashville, TN",
  "Charlotte, NC",
  "Raleigh, NC",
  "Minneapolis, MN",
  "Detroit, MI",
  "Columbus, OH",
  "Portland, OR",
  "Salt Lake City, UT",
  "Las Vegas, NV",
  "Remote",
  "London",
  "Toronto",
  "Sydney",
  "Berlin",
  "Almaty",
  "Astana",
]);

/** Country for job searches. Live listings exist for the first group; any
 * country still gets LinkedIn, Indeed and Google Jobs links. */
export const COUNTRIES: Option[] = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "nl", label: "Netherlands" },
  { value: "in", label: "India" },
  { value: "sg", label: "Singapore" },
  { value: "kz", label: "Kazakhstan" },
];
