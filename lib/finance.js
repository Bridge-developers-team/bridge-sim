// Optional money check. Uses ONLY numbers the user typed; never fills in
// salaries or course prices. Returns "not enough information" instead of a
// guess when an input is missing.
//
// Estimated transition cost =
//   learning expense (monthly learning budget x learning months)
//   + months at reduced income x monthly income shortfall

// "" / null / undefined / negative / not a number -> null (unknown).
export function amount(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const LABELS = {
  learningPerMonth: "monthly learning budget",
  learningMonths: "months of learning",
  monthsReduced: "months at reduced income",
  currentMonthlyIncome: "current monthly income",
  expectedMonthlyIncome: "expected monthly income in the new role",
};

export function transitionCost(input) {
  const v = Object.fromEntries(Object.keys(LABELS).map((k) => [k, amount(input?.[k])]));
  const needed = ["learningPerMonth", "learningMonths", "monthsReduced"];
  if (v.monthsReduced > 0) needed.push("currentMonthlyIncome", "expectedMonthlyIncome");
  const missing = needed.filter((k) => v[k] === null).map((k) => LABELS[k]);
  if (missing.length) return { ok: false, missing };

  const learning = v.learningPerMonth * v.learningMonths;
  const shortfall = v.monthsReduced > 0 ? Math.max(0, v.currentMonthlyIncome - v.expectedMonthlyIncome) : 0;
  const incomeGap = v.monthsReduced * shortfall;
  return { ok: true, learning, shortfall, incomeGap, total: learning + incomeGap };
}

// Is the user's own expected income below their own floor? null when unknown.
export function belowMinimum(expectedMonthlyIncome, minimumAcceptableIncome) {
  const e = amount(expectedMonthlyIncome);
  const m = amount(minimumAcceptableIncome);
  if (e === null || m === null) return null;
  return e < m;
}
