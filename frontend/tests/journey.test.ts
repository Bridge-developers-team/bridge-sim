import { test } from "node:test";
import assert from "node:assert/strict";
import type { CareersResponse, Evaluation, Practice } from "../src/api/types";
import {
  chooseCareer,
  emptyJourney,
  parseJourney,
  withCareers,
  withEvaluation,
  withPractice,
  withRoadmap,
} from "../src/lib/journey.ts";
import { roadmap, task } from "./fixtures.ts";

const careers = { profile: {}, careers: [{ id: "designer" }, { id: "trainer" }], mode: "live" } as unknown as CareersResponse;
const practice = { id: "w1-try" } as Practice;
const evaluation = { totalScore: 9 } as Evaluation;

test("new career paths clear the old plan and practice", () => {
  let j = withRoadmap(chooseCareer(withCareers(emptyJourney(), careers), "designer"), roadmap([[task("a")]]), "live").journey;
  j = withPractice(j, "a", { practice, practiceToken: "t", mode: "live", answer: "" });

  const fresh = withCareers(j, careers);

  assert.equal(fresh.roadmap, undefined);
  assert.deepEqual(fresh.practices, {});
});

test("switching path drops the plan; coming back to the same path keeps it", () => {
  const j = withRoadmap(chooseCareer(withCareers(emptyJourney(), careers), "designer"), roadmap([[task("a")]]), "live").journey;

  assert.ok(chooseCareer(j, "designer").roadmap);
  assert.equal(chooseCareer(j, "trainer").roadmap, undefined);
});

test("regenerating the same path merges ticks and reports what was kept", () => {
  const first = withRoadmap(emptyJourney(), roadmap([[task("a", true), task("b", true)]]), "live").journey;

  const { journey, kept, lost } = withRoadmap(first, roadmap([[task("a"), task("c")]]), "live");

  assert.equal(kept, 1);
  assert.equal(lost, 1);
  assert.equal(journey.roadmap!.weeks[0]!.tasks[0]!.completed, true);
});

test("getting feedback marks the practice task done and clears an old proof link", () => {
  let j = withRoadmap(emptyJourney(), roadmap([[task("w1-try"), task("b")]]), "live").journey;
  j = withPractice(j, "w1-try", { practice, practiceToken: "t", mode: "live", answer: "", proof: { id: "old", deleteKey: "k" } });

  j = withEvaluation(j, "w1-try", { answer: "my answer", evaluation, resultToken: "r", mode: "live" });

  assert.equal(j.roadmap!.weeks[0]!.tasks[0]!.completed, true);
  assert.equal(j.practices["w1-try"]!.evaluation, evaluation);
  assert.equal(j.practices["w1-try"]!.proof, undefined);
});

test("saved state from another version or broken JSON starts fresh, never crashes", () => {
  assert.deepEqual(parseJourney(null), emptyJourney());
  assert.deepEqual(parseJourney("{not json"), emptyJourney());
  assert.deepEqual(parseJourney(JSON.stringify({ version: 1, profile: {} })), emptyJourney());
  const saved = parseJourney(JSON.stringify({ ...emptyJourney(), profile: { hoursPerWeek: 8 } }));
  assert.equal(saved.profile.hoursPerWeek, 8);
  assert.equal(saved.profile.currency, "USD"); // missing fields filled from defaults
});

test("tastings survive choosing a path and rebuilding the plan, and reset with new paths", async () => {
  const { withTasting, updateTasting, tastesOf } = await import("../src/lib/journey.ts");
  const paths = {
    profile: {},
    careers: [
      { id: "designer", title: "Designer" },
      { id: "trainer", title: "Trainer" },
    ],
    mode: "live",
  } as unknown as CareersResponse;
  let j = withCareers(emptyJourney(), paths);
  j = withTasting(j, "designer", { practice, practiceToken: "t", mode: "live", answer: "a" });
  j = withTasting(j, "trainer", { practice, practiceToken: "t", mode: "live", answer: "b" });
  j = updateTasting(j, "designer", { evaluation: { totalScore: 12, maxTotal: 15 } as Evaluation, energy: 5 });
  j = updateTasting(j, "trainer", { evaluation: { totalScore: 14, maxTotal: 15 } as Evaluation }); // no energy yet

  j = withRoadmap(chooseCareer(j, "trainer"), roadmap([[task("a")]], "trainer"), "live").journey;

  assert.deepEqual(tastesOf(j), [{ careerId: "designer", title: "Designer", score: 12, maxScore: 15, energy: 5 }]);
  assert.deepEqual(withCareers(j, paths).tastings, {});
  assert.deepEqual(parseJourney(JSON.stringify({ ...emptyJourney(), tastings: undefined })).tastings, {});
});

test("a saved study schedule survives new career paths", () => {
  const paths = { profile: {}, careers: [], mode: "live" } as unknown as CareersResponse;
  const j = { ...emptyJourney(), schedule: { slots: [{ day: 2, time: "19:00" }], start: "2026-11-16" } };

  assert.deepEqual(withCareers(j, paths).schedule, j.schedule);
  assert.equal(emptyJourney().profile.country, "us");
});
