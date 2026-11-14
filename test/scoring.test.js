import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyEvidence, clampLevel } from "../lib/scoring.js";

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
