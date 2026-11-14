import { test } from "node:test";
import assert from "node:assert/strict";
import { skillMultiplier, courseCost, planSwitch } from "../lib/switchCost.js";
import { ROLES } from "../data/roles.js";

const role = {
  baseHours: 200,
  entryPay: 60000,
  medianPay: 90000,
  courses: [
    { name: "Sub", price: 50, billing: "monthly" },
    { name: "Exam", price: 300, billing: "once" },
  ],
};

test("skillMultiplier maps score 0/50/100 to 1.4/1.0/0.6 and clamps", () => {
  assert.equal(skillMultiplier(0), 1.4);
  assert.equal(skillMultiplier(50), 1);
  assert.equal(skillMultiplier(100), 0.6);
  assert.equal(skillMultiplier(150), 0.6);
  assert.equal(skillMultiplier(null), 1);
  assert.equal(skillMultiplier(undefined), 1);
});

test("courseCost charges monthly courses per month", () => {
  assert.equal(courseCost(role.courses, 6), 600);
  assert.equal(courseCost([], 6), 0);
});

test("planSwitch: pay cut case", () => {
  // 200 h at 10 h/week -> 200 / 43.33 = 4.6 -> 5 months
  const p = planSwitch({ role, currentSalary: 72000, hoursPerWeek: 10, simScore: 50 });
  assert.equal(p.hoursNeeded, 200);
  assert.equal(p.months, 5);
  assert.equal(p.courseCost, 550);
  assert.equal(p.firstYearChange, -12000);
  assert.equal(p.monthlyGap, 1000);
  assert.equal(p.longTermChange, 18000);
  // (550 + 12000) / 18000 = 0.697 -> 0.7
  assert.equal(p.breakEvenYears, 0.7);
});

test("planSwitch: higher sim score means fewer months", () => {
  const low = planSwitch({ role, currentSalary: 50000, hoursPerWeek: 5, simScore: 10 });
  const high = planSwitch({ role, currentSalary: 50000, hoursPerWeek: 5, simScore: 90 });
  assert.ok(high.months < low.months);
  assert.equal(high.monthlyGap, 0);
});

test("planSwitch: never breaks even when median is below current pay", () => {
  const p = planSwitch({ role, currentSalary: 120000, hoursPerWeek: 10 });
  assert.equal(p.breakEvenYears, null);
});

test("planSwitch validates inputs", () => {
  assert.throws(() => planSwitch({ role, currentSalary: -1, hoursPerWeek: 10 }), /salary/);
  assert.throws(() => planSwitch({ role, currentSalary: 50000, hoursPerWeek: 0 }), /Hours/);
  assert.throws(() => planSwitch({ role, currentSalary: 50000, hoursPerWeek: 61 }), /Hours/);
  assert.throws(() => planSwitch({ role: null, currentSalary: 1, hoursPerWeek: 1 }), /role/);
});

test("roles data is complete", () => {
  const ids = new Set();
  for (const r of ROLES) {
    assert.ok(!ids.has(r.id), "duplicate id " + r.id);
    ids.add(r.id);
    assert.ok(r.title && r.blurb);
    assert.ok(r.entryPay > 0 && r.medianPay >= r.entryPay, r.id + " pay");
    assert.ok(r.baseHours > 0, r.id + " hours");
    for (const c of r.courses) assert.ok(["once", "monthly"].includes(c.billing) && c.price >= 0, r.id + " course");
  }
});
