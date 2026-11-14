import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRubric, normalizeSimulation, scoreEvaluation, UNPROVEN_SCORE_CAP } from "../lib/simulation.js";
import { normalizeCareers, titleKey, normalizeYears } from "../lib/careers.js";
import { transitionCost, belowMinimum, amount } from "../lib/finance.js";
import { demoCareers, demoSimulation } from "../server/demo.js";
import { SAMPLES } from "../data/samples.js";

const rawSim = {
  scenario: "A company onboards staff.",
  brief: "Rewrite the objective.",
  expectedDeliverable: "One objective",
  timeboxMinutes: 45,
  rubric: [
    { label: "Measurable", description: "Observable verb", maxScore: 4 },
    { label: "Audience", description: "Fits adults", maxScore: 9 },
    { label: "Rationale", description: "Explains why", maxScore: 1 },
    { label: "", description: "dropped: no label", maxScore: 4 },
  ],
};
const sim = normalizeSimulation(rawSim, { id: "w1-x", targetRole: "Instructional Designer" });
const answer = "By the end of the module, new staff will perform the dock check with no missed steps. Understand is not observable, so I changed it.";

test("simulation: rubric ids are assigned by code, max scores clamped to 3-5, timebox to 5-20", () => {
  assert.deepEqual(sim.rubric.map((c) => [c.id, c.maxScore]), [["c1", 4], ["c2", 5], ["c3", 3]]);
  assert.equal(sim.timeboxMinutes, 20);
  assert.throws(() => normalizeRubric(rawSim.rubric.slice(0, 2)));
});

test("evaluation: real quotes keep their score; invented quotes are capped; scores clamped", () => {
  const ev = scoreEvaluation(answer, sim, {
    criteria: [
      { rubricId: "c1", score: 4, evidence: "new staff will perform the dock check", strengths: ["good verb"], improvements: ["add a condition"] },
      { rubricId: "c2", score: 5, evidence: "a quote that is not in the answer at all", strengths: [], improvements: ["x"] },
      { rubricId: "c3", score: 99, evidence: "Understand is not observable", strengths: [], improvements: [] },
    ],
    overallFeedback: "ok",
    nextRevisionStep: "add a standard",
  });
  assert.equal(ev.feedbackType, "ai_practice_feedback");
  assert.deepEqual(ev.criteria.map((c) => c.score), [4, UNPROVEN_SCORE_CAP, 3]);
  assert.equal(ev.criteria[1].verified, false);
  assert.equal(ev.criteria[1].evidence, "");
  assert.equal(ev.totalScore, 4 + UNPROVEN_SCORE_CAP + 3);
  assert.equal(ev.maxTotal, 12);
});

test("evaluation: a missing criterion scores 0", () => {
  const ev = scoreEvaluation(answer, sim, { criteria: [], overallFeedback: "", nextRevisionStep: "" });
  assert.deepEqual(ev.criteria.map((c) => c.score), [0, 0, 0]);
});

test("demo practice task for instructional design passes normalization", () => {
  const s = normalizeSimulation(demoSimulation({ career: { title: "Instructional Designer" } }), { id: "a", targetRole: "Instructional Designer" });
  assert.equal(s.timeboxMinutes, 10);
  assert.equal(s.rubric.length, 4);
});

test("careers: exactly 3 distinct paths; quotes checked against the resume", () => {
  const resume = SAMPLES.find((s) => s.id === "teacher").resume;
  const careers = normalizeCareers(demoCareers({ resume, profile: {} }).careers, resume);
  assert.equal(careers.length, 3);
  assert.ok(careers.every((c) => c.transferableSkills.every((s) => s.verified)));
  assert.equal(careers[0].title, "Instructional Designer");

  const fake = [
    { title: "Instructional Designer", transferableSkills: [{ skill: "X", evidence: "never wrote this sentence anywhere" }] },
    { title: "Senior Instructional Designer (Corporate)" },
    { title: "Corporate Trainer" },
  ];
  assert.throws(() => normalizeCareers(fake, resume), /3 distinct/);
  const ok = normalizeCareers([...fake, { title: "Project Coordinator", relativeEffort: "impossible" }], resume);
  assert.equal(ok[0].transferableSkills[0].verified, false);
  assert.equal(ok[0].transferableSkills[0].evidence, "");
  assert.equal(ok[2].relativeEffort, "unknown");
  assert.equal(titleKey("Junior Data Analyst"), titleKey("data analyst"));
});

test("normalizeYears keeps plausible numbers only", () => {
  assert.equal(normalizeYears(7), 7);
  assert.equal(normalizeYears("7.4"), 7);
  assert.equal(normalizeYears(null), null);
  assert.equal(normalizeYears(""), null);
  assert.equal(normalizeYears(-1), null);
  assert.equal(normalizeYears(99), null);
});

test("finance: no estimate without the inputs it needs", () => {
  const out = transitionCost({ learningPerMonth: 0, learningMonths: 3, monthsReduced: 2, currentMonthlyIncome: "" });
  assert.equal(out.ok, false);
  assert.deepEqual(out.missing, ["current monthly income", "expected monthly income in the new role"]);
  assert.equal(transitionCost({}).ok, false);
});

test("finance: formula = learning + months reduced x shortfall; no income needed when months reduced is 0", () => {
  const a = transitionCost({ learningPerMonth: 50, learningMonths: 3, monthsReduced: 2, currentMonthlyIncome: 3000, expectedMonthlyIncome: 2500 });
  assert.deepEqual(a, { ok: true, learning: 150, shortfall: 500, incomeGap: 1000, total: 1150 });
  const b = transitionCost({ learningPerMonth: 0, learningMonths: 1, monthsReduced: 0 });
  assert.equal(b.ok, true);
  assert.equal(b.total, 0);
  const c = transitionCost({ learningPerMonth: 0, learningMonths: 1, monthsReduced: 1, currentMonthlyIncome: 2000, expectedMonthlyIncome: 2600 });
  assert.equal(c.shortfall, 0);
});

test("finance: unknown values stay unknown", () => {
  assert.equal(amount(""), null);
  assert.equal(amount(-5), null);
  assert.equal(amount("abc"), null);
  assert.equal(belowMinimum("", 2000), null);
  assert.equal(belowMinimum(1800, 2000), true);
});
