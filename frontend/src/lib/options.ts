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

/** Big job markets in each country the form offers, largest first. Any other
 * place can be typed into the search box. US cities carry the state code: the
 * pay table reads the state from it ("Austin, TX" -> Texas). */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  us: [
    "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Dallas, TX", "Austin, TX",
    "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "San Francisco, CA",
    "San Jose, CA", "Seattle, WA", "Denver, CO", "Boston, MA", "Atlanta, GA", "Miami, FL", "Orlando, FL",
    "Tampa, FL", "Washington, DC", "Baltimore, MD", "Nashville, TN", "Charlotte, NC", "Raleigh, NC",
    "Minneapolis, MN", "Detroit, MI", "Columbus, OH", "Indianapolis, IN", "Kansas City, MO", "St. Louis, MO",
    "Portland, OR", "Salt Lake City, UT", "Las Vegas, NV", "Pittsburgh, PA", "Sacramento, CA",
  ],
  gb: [
    "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh", "Bristol", "Liverpool",
    "Newcastle upon Tyne", "Sheffield", "Nottingham", "Cardiff", "Belfast", "Cambridge", "Oxford", "Reading",
    "Southampton", "Brighton", "Leicester", "Aberdeen",
  ],
  ca: [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City",
    "Hamilton", "Kitchener", "London, ON", "Victoria", "Halifax", "Saskatoon", "Regina", "Mississauga",
  ],
  au: [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Gold Coast", "Newcastle, NSW",
    "Hobart", "Darwin", "Geelong", "Wollongong",
  ],
  de: [
    "Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf", "Leipzig", "Dresden",
    "Hanover", "Nuremberg", "Bremen", "Essen", "Dortmund", "Bonn", "Karlsruhe", "Mannheim",
  ],
  fr: [
    "Paris", "Lyon", "Marseille", "Toulouse", "Lille", "Bordeaux", "Nantes", "Nice", "Strasbourg",
    "Montpellier", "Rennes", "Grenoble",
  ],
  nl: [
    "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen", "Tilburg", "Almere",
    "Breda", "Nijmegen", "Haarlem", "Leiden",
  ],
  in: [
    "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Gurugram", "Noida", "Kolkata",
    "Ahmedabad", "Jaipur", "Kochi", "Chandigarh", "Coimbatore", "Indore", "Lucknow",
  ],
  sg: ["Singapore"],
  kz: [
    "Almaty", "Astana", "Shymkent", "Karaganda", "Aktobe", "Atyrau", "Aktau", "Pavlodar",
    "Ust-Kamenogorsk", "Kostanay", "Taraz", "Semey", "Kyzylorda", "Uralsk", "Petropavl", "Turkestan",
  ],
};

/** The pick list for one country, with "Remote" last. */
export function citiesFor(country: string): Option[] {
  return list([...(CITIES_BY_COUNTRY[country] ?? []), "Remote"]);
}

/** Each country's own currency, where the form offers it. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  us: "USD",
  gb: "GBP",
  ca: "CAD",
  au: "AUD",
  de: "EUR",
  fr: "EUR",
  nl: "EUR",
  kz: "KZT",
};

/** A best guess at the user's country from the browser's time zone, so a
 * visitor from Almaty does not start in the United States. Anything unknown
 * starts in the United States, the hackathon's market. */
export function countryFromTimeZone(timeZone: string): string {
  const tz = timeZone || "";
  const exact: Record<string, string> = {
    "Europe/London": "gb",
    "Europe/Belfast": "gb",
    "Europe/Berlin": "de",
    "Europe/Busingen": "de",
    "Europe/Paris": "fr",
    "Europe/Amsterdam": "nl",
    "Asia/Kolkata": "in",
    "Asia/Calcutta": "in",
    "Asia/Singapore": "sg",
  };
  if (exact[tz]) return exact[tz];
  if (/^Australia\//.test(tz)) return "au";
  if (/^Asia\/(Almaty|Qostanay|Aqtobe|Aqtau|Atyrau|Oral|Qyzylorda)$/.test(tz)) return "kz";
  if (
    /^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns|Moncton|Whitehorse|Yellowknife|Iqaluit|Glace_Bay|Goose_Bay|Swift_Current|Dawson_Creek|Fort_Nelson|Cambridge_Bay|Rankin_Inlet|Resolute|Inuvik|Atikokan|Blanc-Sablon|Creston|Dawson)$/.test(
      tz,
    )
  )
    return "ca";
  return "us";
}

export function browserCountry(): string {
  try {
    return countryFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "us";
  }
}

/** A new country on the form: the city is kept only if it belongs to that
 * country's list (or is "Remote"), and the currency follows the country, with
 * the learning budget moved to the same step in the new currency. */
export function withCountry<P extends { country: string; location: string; currency: string; monthlyLearningBudget: number }>(
  profile: P,
  country: string,
): P {
  const keepCity =
    profile.location.toLowerCase() === "remote" ||
    (CITIES_BY_COUNTRY[country] ?? []).some((c) => c.toLowerCase() === profile.location.toLowerCase());
  const currency = COUNTRY_CURRENCY[country] ?? profile.currency;
  return {
    ...profile,
    country,
    location: keepCity ? profile.location : "",
    currency,
    monthlyLearningBudget: convertBudget(profile.monthlyLearningBudget, profile.currency, currency),
  };
}

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
