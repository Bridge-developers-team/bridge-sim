import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRoadmap,
  checkRoadmap,
  fitWeekToBudget,
  progress,
  nextAction,
  weekStatus,
  weekMinutes,
  setTaskCompleted,
  mergeProgress,
  normalizeTask,
  clampHours,
  slug,
  QUICK_TASK_MAX_MIN,
} from "../lib/roadmap.js";
import { demoRoadmap } from "../server/demo.js";

const career = { id: "instructional-designer", title: "Instructional Designer", missingSkills: ["Storyboarding"], transferableSkills: [] };
const ctx = (over = {}) => ({ id: "r1", candidateId: "c1", career, currentRole: "Teacher", track: "balanced", hoursPerWeek: 5, createdAt: "2026-11-14", ...over });

function task(title, minutes, type = "research") {
  return { title, type, estimatedMinutes: minutes, whyThisMatters: "why", instructions: ["do it"], deliverable: "a thing", successCriteria: "it exists" };
}

// An over-full AI plan: 400 minutes a week for a 5-hour (300 min) person, no quick task.
const overfull = {
  weeks: [1, 2, 3, 4].map((n) => ({ title: `W${n}`, objective: "o", tasks: [task(`A${n}`, 200), task(`B${n}`, 150), task(`C${n}`, 50)] })),
  assumptions: ["a"],
  cautions: [],
};

test("weekly minutes never exceed hoursPerWeek x 60", () => {
  for (const hours of [1, 2, 5, 12]) {
    const r = buildRoadmap(overfull, ctx({ hoursPerWeek: hours }));
    for (const w of r.weeks) assert.ok(weekMinutes(w) <= hours * 60, `week ${w.week} at ${hours}h: ${weekMinutes(w)} min`);
    assert.deepEqual(checkRoadmap(r), []);
  }
});

test("dropped tasks are reported as cautions, never silently", () => {
  const r = buildRoadmap(overfull, ctx());
  assert.ok(r.cautions.some((c) => /left out/.test(c)));
});

test("week 1 always starts with an in-app practice task of 10 minutes or less", () => {
  const r = buildRoadmap(overfull, ctx());
  const first = r.weeks[0].tasks[0];
  assert.equal(first.type, "simulation");
  assert.ok(first.estimatedMinutes <= QUICK_TASK_MAX_MIN);
  assert.equal(first.simulationId, first.id);
});

test("an AI simulation task in week 1 is moved first and timeboxed to 10 minutes", () => {
  const raw = structuredClone(overfull);
  raw.weeks[0].tasks.push(task("Rewrite one objective", 25, "simulation"));
  const r = buildRoadmap(raw, ctx());
  assert.equal(r.weeks[0].tasks[0].title, "Rewrite one objective");
  assert.equal(r.weeks[0].tasks[0].estimatedMinutes, 10);
  assert.equal(r.weeks[0].tasks.filter((t) => t.type === "simulation").length, 1);
});

test("a week whose only task is too long is shortened, not emptied", () => {
  const out = fitWeekToBudget([normalizeTask(task("Huge", 500))], 60);
  assert.equal(out.tasks.length, 1);
  assert.equal(out.tasks[0].estimatedMinutes, 60);
  assert.equal(out.shortened, true);
});

test("tasks missing a deliverable or success criteria are dropped; unknown types become learning", () => {
  assert.equal(normalizeTask({ ...task("x", 10), deliverable: "" }), null);
  assert.equal(normalizeTask({ ...task("x", 10), successCriteria: " " }), null);
  assert.equal(normalizeTask({ ...task("x", 10), type: "party" }).type, "learning");
});

test("fewer than 4 weeks is rejected", () => {
  assert.throws(() => buildRoadmap({ weeks: overfull.weeks.slice(0, 3) }, ctx()));
});

test("task ids are stable and unique", () => {
  const a = buildRoadmap(overfull, ctx());
  const b = buildRoadmap(overfull, ctx({ id: "r2" }));
  assert.deepEqual(a.weeks.flatMap((w) => w.tasks.map((t) => t.id)), b.weeks.flatMap((w) => w.tasks.map((t) => t.id)));
  const raw = structuredClone(overfull);
  raw.weeks[1].tasks = [task("Same", 20), task("Same", 20)];
  const ids = buildRoadmap(raw, ctx()).weeks[1].tasks.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("progress, week status and next action follow completed ticks", () => {
  let r = buildRoadmap(overfull, ctx());
  const total = progress(r).total;
  assert.deepEqual(progress(r), { done: 0, total, percent: 0 });
  assert.equal(weekStatus(r.weeks[0]), "not-started");
  const first = r.weeks[0].tasks[0];
  assert.equal(nextAction(r).task.id, first.id);

  r = setTaskCompleted(r, first.id, true);
  assert.equal(progress(r).done, 1);
  assert.equal(progress(r).percent, Math.round((1 / total) * 100));
  assert.equal(weekStatus(r.weeks[0]), "in-progress");
  assert.notEqual(nextAction(r).task.id, first.id);

  for (const t of r.weeks.flatMap((w) => w.tasks)) r = setTaskCompleted(r, t.id, true);
  assert.equal(progress(r).percent, 100);
  assert.equal(weekStatus(r.weeks[3]), "completed");
  assert.equal(nextAction(r), null);

  r = setTaskCompleted(r, first.id, false);
  assert.equal(progress(r).done, total - 1);
});

test("progress survives a JSON round trip (localStorage rehydration)", () => {
  let r = buildRoadmap(overfull, ctx());
  r = setTaskCompleted(r, r.weeks[1].tasks[0].id, true);
  const back = JSON.parse(JSON.stringify(r));
  assert.deepEqual(progress(back), progress(r));
  assert.equal(nextAction(back).task.id, nextAction(r).task.id);
});

test("mergeProgress keeps ticks for tasks that still exist and counts the rest", () => {
  let old = buildRoadmap(overfull, ctx());
  old = setTaskCompleted(old, old.weeks[0].tasks[0].id, true); // quick task: same title in the new plan
  old = setTaskCompleted(old, old.weeks[1].tasks[0].id, true); // A2: gone in the new plan
  const raw = structuredClone(overfull);
  raw.weeks[1].tasks[0].title = "Something new";
  const { roadmap, kept, lost } = mergeProgress(old, buildRoadmap(raw, ctx({ id: "r2" })));
  assert.equal(kept, 1);
  assert.equal(lost, 1);
  assert.equal(progress(roadmap).done, 1);
});

test("clampHours and slug", () => {
  assert.equal(clampHours("abc"), 5);
  assert.equal(clampHours(0), 1);
  assert.equal(clampHours(99), 40);
  assert.equal(clampHours(2.3), 2.5);
  assert.equal(slug("Analyze 2 Job Descriptions!"), "analyze-2-job-descriptions");
  assert.equal(slug("¿Qué?"), "que");
  assert.equal(slug(""), "item");
});

test("demo template passes every roadmap rule on every track and time budget", () => {
  for (const track of ["safe", "balanced", "fast"]) {
    for (const hours of [1, 3, 5, 10, 40]) {
      const r = buildRoadmap(demoRoadmap({ career, track, hoursPerWeek: hours }), ctx({ track, hoursPerWeek: hours }));
      assert.deepEqual(checkRoadmap(r), [], `${track} ${hours}h`);
      for (const t of r.weeks.flatMap((w) => w.tasks)) assert.equal(t.resourceUrl, undefined);
    }
  }
});
