/** Optional money check. Runs only in the browser: income figures are never
 * sent anywhere. Uses ONLY numbers the user typed and never fills in salaries
 * or prices; a missing input gives "not enough information", not a guess.
 *
 *   cost = learning budget x learning months
 *        + months at reduced income x monthly shortfall
 */

export interface FinanceInput {
  learningPerMonth: string | number;
  learningMonths: string | number;
  monthsReduced: string | number;
  currentMonthlyIncome: string | number;
  expectedMonthlyIncome: string | number;
}

export type FinanceResult =
  | { ok: true; learning: number; shortfall: number; incomeGap: number; total: number }
  | { ok: false; missing: string[] };

const LABELS: Record<keyof FinanceInput, string> = {
  learningPerMonth: "monthly learning budget",
  learningMonths: "months of learning",
  monthsReduced: "months at reduced income",
  currentMonthlyIncome: "current monthly income",
  expectedMonthlyIncome: "expected monthly income in the new role",
};

/** "" / negative / not a number -> null (unknown). */
export function amount(value: string | number | null | undefined): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function transitionCost(input: FinanceInput): FinanceResult {
  const v = {
    learningPerMonth: amount(input.learningPerMonth),
    learningMonths: amount(input.learningMonths),
    monthsReduced: amount(input.monthsReduced),
    currentMonthlyIncome: amount(input.currentMonthlyIncome),
    expectedMonthlyIncome: amount(input.expectedMonthlyIncome),
  };
  const needed: (keyof FinanceInput)[] = ["learningPerMonth", "learningMonths", "monthsReduced"];
  if ((v.monthsReduced ?? 0) > 0) needed.push("currentMonthlyIncome", "expectedMonthlyIncome");
  const missing = needed.filter((k) => v[k] === null).map((k) => LABELS[k]);
  if (missing.length) return { ok: false, missing };

  const learning = v.learningPerMonth! * v.learningMonths!;
  const shortfall = v.monthsReduced! > 0 ? Math.max(0, v.currentMonthlyIncome! - v.expectedMonthlyIncome!) : 0;
  const incomeGap = v.monthsReduced! * shortfall;
  return { ok: true, learning, shortfall, incomeGap, total: learning + incomeGap };
}
