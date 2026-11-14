import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyEvidence, clampLevel, scoreTask, overallScore, bandFor } from "../lib/scoring.js";

const answer = `The main issue is that “handover notes” are lost between shifts.
I would start with a one-page checklist and test it for two weeks.`;

test("verifyEvidence matches verbatim quotes, ignoring case, spacing and smart quotes", () => {
  assert.equal(verifyEvidence(answer, 'the main issue is that "handover notes" are lost'), true);
  assert.equal(verifyEvidence(answer, "I would  start with a one-page checklist."), true);
});

test("verifyEvidence rejects paraphrases and too-short quotes", () => {
  assert.equal(verifyEvidence(answer, "I would begin with a checklist"), false);
  assert.equal(verifyEvidence(answer, "checklist"), false);
  assert.equal(verifyEvidence(answer, ""), false);
  assert.equal(verifyEvidence(answer, null), false);
});

test("clampLevel rounds and bounds to 0-4", () => {
  assert.equal(clampLevel(5), 4);
  assert.equal(clampLevel(-2), 0);
  assert.equal(clampLevel(2.6), 3);
  assert.equal(clampLevel("x"), 0);
});

test("scoreTask: all level 4 with real quotes scores 100", () => {
  const q = "start with a one-page checklist";
  const out = scoreTask(answer, ["problem", "background", "craft", "clarity"].map((id) => ({ id, level: 4, evidence: q, reason: "" })));
  assert.equal(out.score, 100);
  assert.equal(out.band, "Strong signal");
});

test("scoreTask caps unverified high levels at 1", () => {
  const out = scoreTask(answer, [
    { id: "problem", level: 4, evidence: "a quote the grader made up", reason: "" },
    { id: "background", level: 0, evidence: "", reason: "" },
    { id: "craft", level: 0, evidence: "", reason: "" },
    { id: "clarity", level: 0, evidence: "", reason: "" },
  ]);
  const problem = out.criteria.find((c) => c.id === "problem");
  assert.equal(problem.levelRaw, 4);
  assert.equal(problem.level, 1);
  assert.equal(problem.verified, false);
  // problem weight 0.3 * (1/4) = 7.5 -> 8
  assert.equal(out.score, 8);
});

test("scoreTask uses weights and treats missing criteria as 0", () => {
  const q = "test it for two weeks";
  const out = scoreTask(answer, [
    { id: "problem", level: 4, evidence: q, reason: "" }, // 0.3
    { id: "craft", level: 2, evidence: q, reason: "" }, // 0.3 * 0.5 = 0.15
  ]);
  assert.equal(out.score, 45);
  assert.equal(out.criteria.length, 4);
  assert.equal(out.criteria.find((c) => c.id === "clarity").level, 0);
});

test("overallScore averages valid scores only", () => {
  assert.equal(overallScore([80, 61, 40]), 60);
  assert.equal(overallScore([]), null);
  assert.equal(overallScore([NaN, 50]), 50);
});

test("bandFor boundaries", () => {
  assert.equal(bandFor(80).label, "Strong signal");
  assert.equal(bandFor(79).label, "Hire-ready with coaching");
  assert.equal(bandFor(40).label, "Getting there");
  assert.equal(bandFor(0).label, "Not yet");
});
