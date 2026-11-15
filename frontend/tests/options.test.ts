// Learning budget: every currency has its own round steps, and switching
// currency keeps the same step instead of reading 500 USD as 500 KZT.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS, budgetLabel, budgetSteps, convertBudget, CURRENCIES } from "../src/lib/options.ts";

test("every currency offers the same number of steps, starting at free", () => {
  for (const c of CURRENCIES) {
    assert.equal(BUDGETS[c].length, BUDGETS.USD.length, c);
    assert.equal(BUDGETS[c][0], 0, c);
  }
});

test("switching currency keeps the step, not the number", () => {
  assert.equal(convertBudget(500, "USD", "KZT"), 250_000);
  assert.equal(convertBudget(50_000, "KZT", "USD"), 100);
  assert.equal(convertBudget(0, "USD", "KZT"), 0);
  assert.equal(convertBudget(60, "USD", "GBP"), 40); // between steps: snaps down
});

test("unknown currencies fall back to USD steps; labels group thousands", () => {
  assert.deepEqual(budgetSteps("XYZ"), BUDGETS.USD);
  assert.equal(budgetLabel(250_000, "KZT"), "250,000 KZT a month");
  assert.equal(budgetLabel(0, "KZT"), "Free resources only");
});
