import { test } from "node:test";
import assert from "node:assert/strict";
import { verifySkills, levelMap, roleFit, interestMatch, rankRoles } from "../lib/fit.js";
import { SKILLS, SKILL_IDS } from "../data/skills.js";
import { ROLES, getRole } from "../data/roles.js";

const cv = `BA Political Science, 2025. Senior thesis: panel regression of turnout on unemployment across 50 states, written in R.
Research assistant: cleaned survey data for a professor's lab. Wrote three op-eds for the student paper.`;

test("verifySkills keeps verified levels, caps unverified ones at 1, drops unknown ids and level 0", () => {
  const out = verifySkills(cv, [
    { id: "statistics", level: 3, evidence: "panel regression of turnout on unemployment" },
    { id: "programming", level: 2, evidence: "fluent in Python and SQL" }, // not in text
    { id: "made_up_skill", level: 3, evidence: "panel regression of turnout" },
    { id: "writing", level: 0, evidence: "" },
  ], SKILL_IDS);
  const byId = Object.fromEntries(out.map((s) => [s.id, s]));
  assert.equal(byId.statistics.level, 3);
  assert.equal(byId.statistics.verified, true);
  assert.equal(byId.programming.level, 1);
  assert.equal(byId.programming.verified, false);
  assert.equal(byId.made_up_skill, undefined);
  assert.equal(byId.writing, undefined);
});

test("verifySkills keeps the best entry when a skill appears twice and clamps to 3", () => {
  const out = verifySkills(cv, [
    { id: "statistics", level: 1, evidence: "panel regression of turnout" },
    { id: "statistics", level: 9, evidence: "panel regression of turnout on unemployment" },
  ], SKILL_IDS);
  assert.equal(out.length, 1);
  assert.equal(out[0].level, 3);
});

test("roleFit: full match is 100 with no gaps", () => {
  const role = getRole("policy-analyst");
  const levels = Object.fromEntries(role.needs.map((n) => [n.skill, n.level]));
  const f = roleFit(role, levels, SKILLS);
  assert.equal(f.fit, 100);
  assert.equal(f.gaps.length, 0);
  assert.equal(f.gapHours, 0);
});

test("roleFit: weights and gap hours", () => {
  const role = {
    id: "x",
    needs: [
      { skill: "statistics", level: 2, weight: 3 }, // have 2 -> 3/3
      { skill: "programming", level: 2, weight: 1 }, // have 0 -> 0, gap 2 levels x 80h
    ],
  };
  const f = roleFit(role, { statistics: 3 }, SKILLS);
  assert.equal(f.fit, 75);
  assert.equal(f.gapHours, 160);
  assert.deepEqual(f.gaps.map((g) => g.skill), ["programming"]);
});

test("interestMatch matches whole tags only", () => {
  const ds = getRole("data-scientist");
  assert.equal(interestMatch(ds, "I'm curious about machine learning and finance"), true);
  assert.equal(interestMatch(ds, "HTML email design"), false); // "ml" inside a word must not match
  assert.equal(interestMatch(ds, ""), false);
});

test("rankRoles: a quant poli-sci profile ranks policy/quant roles above HR", () => {
  const levels = levelMap(verifySkills(cv, [
    { id: "statistics", level: 3, evidence: "panel regression of turnout on unemployment" },
    { id: "programming", level: 2, evidence: "written in R" },
    { id: "data_wrangling", level: 2, evidence: "cleaned survey data for a professor's lab" },
    { id: "writing", level: 2, evidence: "Wrote three op-eds for the student paper" },
    { id: "policy_institutions", level: 2, evidence: "BA Political Science" },
  ], SKILL_IDS));
  const ranked = rankRoles(ROLES, levels, SKILLS, "finance or machine learning");
  const pos = (id) => ranked.findIndex((r) => r.roleId === id);
  assert.ok(pos("data-scientist") < pos("hr-specialist"));
  assert.ok(pos("policy-analyst") < pos("customer-success-manager"));
  assert.equal(ranked.find((r) => r.roleId === "risk-analyst").curious, true);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].fit >= ranked[i].fit);
});

test("every role need points at a real skill with a sane level", () => {
  for (const r of ROLES) {
    assert.ok(r.needs.length >= 3, r.id);
    for (const n of r.needs) {
      assert.ok(SKILL_IDS.includes(n.skill), `${r.id}: ${n.skill}`);
      assert.ok(n.level >= 1 && n.level <= 3 && n.weight > 0, r.id);
    }
  }
});
