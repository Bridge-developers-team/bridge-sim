/** Pick lists for the start form. Front-end only: the API still receives plain
 * strings, so a role that is not listed can be typed into the search box and
 * used as is. */

import countryData from "../data/countries.json" with { type: "json" };

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

export function budgetLabel(amount: number, currency: string): string {
  return amount === 0 ? "Free courses only" : `${amount.toLocaleString("en-US")} ${currency} a month`;
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

interface Country {
  code: string;
  name: string;
  currency: string;
}

/** Every country (GeoNames), with its own currency. */
export const COUNTRY_LIST = countryData as Country[];
export const COUNTRIES: Option[] = COUNTRY_LIST.map((c) => ({ value: c.code, label: c.name }));

export function countryName(code: string): string {
  return COUNTRY_LIST.find((c) => c.code === code)?.name ?? code.toUpperCase();
}

export function countryCurrency(code: string): string | undefined {
  return COUNTRY_LIST.find((c) => c.code === code)?.currency;
}

function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every currency some country uses, as "KZT · Kazakhstani Tenge". */
export const CURRENCY_OPTIONS: Option[] = [...new Set(COUNTRY_LIST.map((c) => c.currency).filter(Boolean))]
  .sort()
  .map((code) => ({ value: code, label: `${code} · ${currencyName(code)}` }));

/** Matches that start with the query first, then words that start with it,
 * then anything else containing it. */
export function rankOptions(options: Option[], query: string): Option[] {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  const starts: Option[] = [];
  const words: Option[] = [];
  const within: Option[] = [];
  for (const o of options) {
    const l = o.label.toLowerCase();
    if (l.startsWith(q)) starts.push(o);
    else if (l.includes(" " + q) || l.includes("-" + q) || l.includes("(" + q)) words.push(o);
    else if (l.includes(q)) within.push(o);
  }
  return [...starts, ...words, ...within];
}

/** Thousands of real job titles (O*NET reported titles, CC BY 4.0), loaded
 * on first use so the start page stays light. Common career-change roles
 * come first. */
let jobTitles: Promise<Option[]> | null = null;
export function loadJobTitles(): Promise<Option[]> {
  jobTitles ??= import("../data/jobs.json").then((m) => {
    const seen = new Set<string>();
    const out: Option[] = [];
    for (const t of [...CURRENT_ROLES.map((o) => o.label), ...TARGET_ROLES.map((o) => o.label), ...(m.default as string[])]) {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ value: t, label: t });
      }
    }
    return out;
  });
  return jobTitles;
}
