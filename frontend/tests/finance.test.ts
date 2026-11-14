import { test } from "node:test";
import assert from "node:assert/strict";
import { transitionCost } from "../src/lib/finance.ts";

const base = { learningPerMonth: "", learningMonths: "", monthsReduced: "", currentMonthlyIncome: "", expectedMonthlyIncome: "" };

test("no estimate without the inputs it needs, and it names them", () => {
  const result = transitionCost(base);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.missing.includes("monthly learning budget"));
});

test("formula = learning + months reduced x shortfall", () => {
  const result = transitionCost({
    ...base,
    learningPerMonth: 50,
    learningMonths: 4,
    monthsReduced: 3,
    currentMonthlyIncome: 4000,
    expectedMonthlyIncome: 3500,
  });
  assert.deepEqual(result, { ok: true, learning: 200, shortfall: 500, incomeGap: 1500, total: 1700 });
});

test("no income needed when there are no months at reduced income; a raise is not a negative cost", () => {
  assert.deepEqual(transitionCost({ ...base, learningPerMonth: 0, learningMonths: 3, monthsReduced: 0 }), {
    ok: true,
    learning: 0,
    shortfall: 0,
    incomeGap: 0,
    total: 0,
  });
  const raise = transitionCost({
    ...base,
    learningPerMonth: 10,
    learningMonths: 1,
    monthsReduced: 2,
    currentMonthlyIncome: 3000,
    expectedMonthlyIncome: 3600,
  });
  assert.ok(raise.ok && raise.incomeGap === 0 && raise.total === 10);
});

test("negative or non-numeric input stays unknown", () => {
  const result = transitionCost({ ...base, learningPerMonth: -5, learningMonths: "abc", monthsReduced: 0 });
  assert.ok(!result.ok && result.missing.length === 2);
});
