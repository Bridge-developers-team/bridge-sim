/** Pick lists for the start form. Front-end only: the API still receives plain
 * strings, so a role that is not listed can be typed into the search box and
 * used as is. */

import { getReference } from "./reference.ts";

export interface Option {
  value: string;
  label: string;
}

const list = (labels: string[]): Option[] => labels.map((label) => ({ value: label, label }));

/** Suggested current roles, roles to move into and reasons to change: reference data from the server. */
export const currentRoles = (): Option[] => list(getReference().currentRoles);
export const targetRoles = (): Option[] => list(getReference().targetRoles);
export const motivations = (): string[] => getReference().motivations;


export const HOURS = [2, 3, 5, 8, 10, 15, 20];

export function budgetLabel(amount: number, currency: string): string {
  return amount === 0 ? "Free courses only" : `${amount.toLocaleString("en-US")} ${currency} a month`;
}


/** Every country (GeoNames), with its own currency: reference data from the server. */
export function countries(): Option[] {
  return getReference().countries.map((c) => ({ value: c.code, label: c.name }));
}

export function countryName(code: string): string {
  return getReference().countries.find((c) => c.code === code)?.name ?? code.toUpperCase();
}

export function countryCurrency(code: string): string | undefined {
  return getReference().countries.find((c) => c.code === code)?.currency || undefined;
}

function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every currency some country uses, as "KZT · Kazakhstani Tenge". */
export function currencyOptions(): Option[] {
  return [...new Set(getReference().countries.map((c) => c.currency).filter(Boolean))]
    .sort()
    .map((code) => ({ value: code, label: `${code} · ${currencyName(code)}` }));
}

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

function roundNice(n: number): number {
  if (n <= 0) return 0;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}

/** A new country on the form: a city from another country is dropped (only
 * "Remote" carries over), the currency follows the country, and the budget is
 * carried into it roughly. */
export function withCountry<P extends { country: string; location: string; currency: string; monthlyLearningBudget: number }>(
  profile: P,
  country: string,
): P {
  if (country === profile.country) return profile;
  const currency = countryCurrency(country) ?? profile.currency;
  const rates = getReference().usdRates;
  const from = rates[profile.currency];
  const to = rates[currency];
  const budget =
    currency === profile.currency || !from || !to ? profile.monthlyLearningBudget : roundNice((profile.monthlyLearningBudget / from) * to);
  return {
    ...profile,
    country,
    location: profile.location.toLowerCase() === "remote" ? profile.location : "",
    currency,
    monthlyLearningBudget: budget,
  };
}
