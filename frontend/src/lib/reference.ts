/** Reference data from the server's database (countries with currencies,
 * suggested roles, reasons to change, rough exchange rates), loaded once at
 * start-up from /api/config. Long lists (job titles, cities) are searched on
 * the server instead. */

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
}

export interface ReferenceData {
  countries: CountryInfo[];
  currentRoles: string[];
  targetRoles: string[];
  motivations: string[];
  /** Rough units per US dollar, only to carry a typed budget into a new currency. */
  usdRates: Record<string, number>;
}

const EMPTY: ReferenceData = { countries: [], currentRoles: [], targetRoles: [], motivations: [], usdRates: {} };
let current: ReferenceData = EMPTY;

export function setReference(data: ReferenceData): void {
  current = data;
}

export function getReference(): ReferenceData {
  return current;
}
