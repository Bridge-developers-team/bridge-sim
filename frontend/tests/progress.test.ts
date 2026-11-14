// Roadmap progress in the browser. Node's built-in test runner with type
// stripping (`npm test`), no test framework installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProgress, nextAction, progress, setTaskCompleted, weekStatus } from "../src/lib/progress.ts";
import { roadmap, task } from "./fixtures.ts";

test("progress, week status and next action follow the ticks", () => {
  let plan = roadmap([[task("a"), task("b")], [task("c")]]);
  assert.deepEqual(progress(plan), { done: 0, total: 3, percent: 0 });
  assert.equal(nextAction(plan)?.task.id, "a");

  plan = setTaskCompleted(plan, "a", true);
  assert.deepEqual(progress(plan), { done: 1, total: 3, percent: 33 });
  assert.equal(weekStatus(plan.weeks[0]!), "in-progress");
  assert.equal(nextAction(plan)?.task.id, "b");

  plan = setTaskCompleted(setTaskCompleted(plan, "b", true), "c", true);
  assert.equal(weekStatus(plan.weeks[0]!), "completed");
  assert.equal(nextAction(plan), null);
  assert.equal(progress(plan).percent, 100);
});

test("ticks survive a JSON round trip (reload from localStorage)", () => {
  const plan = setTaskCompleted(roadmap([[task("a"), task("b")]]), "b", true);
  const restored = JSON.parse(JSON.stringify(plan));
  assert.deepEqual(progress(restored), progress(plan));
});

test("a regenerated plan keeps ticks for tasks that still exist and counts the rest", () => {
  const old = roadmap([[task("a", true), task("gone", true), task("b")]]);
  const fresh = roadmap([[task("a"), task("b"), task("new")]]);

  const { roadmap: merged, kept, lost } = mergeProgress(old, fresh);

  assert.equal(kept, 1);
  assert.equal(lost, 1);
  assert.deepEqual(
    merged.weeks[0]!.tasks.map((t) => [t.id, t.completed]),
    [["a", true], ["b", false], ["new", false]],
  );
});
