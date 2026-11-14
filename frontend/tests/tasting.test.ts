// Career tasting: quadrants, ranking and when Bridge may recommend a path.
import { test } from "node:test";
import assert from "node:assert/strict";
import { quadrantOf, rankTastes, recommend, type Taste } from "../src/lib/tasting.ts";

const taste = (careerId: string, score: number, energy: number, maxScore = 15): Taste => ({
  careerId,
  title: careerId,
  score,
  maxScore,
  energy,
});

test("the four quadrants: skill 60%+ is strong, energy 4+ is wanted", () => {
  assert.equal(quadrantOf(0.6, 4), "thrive");
  assert.equal(quadrantOf(0.59, 5), "grow");
  assert.equal(quadrantOf(0.9, 3), "trap"); // "It's fine" is not enough to switch for
  assert.equal(quadrantOf(0.2, 2), "skip");
});

test("energy outranks skill: a wanted path beats one the user is good at but dreads", () => {
  const ranked = rankTastes([taste("trainer", 14, 1), taste("designer", 7, 5), taste("coordinator", 12, 4)]);

  assert.deepEqual(
    ranked.map((t) => [t.careerId, t.quadrant]),
    [
      ["coordinator", "thrive"],
      ["designer", "grow"],
      ["trainer", "trap"],
    ],
  );
  assert.match(ranked[2]!.reason, /14\/15.*"Dreading it"/);
});

test("no recommendation from one taste, or when every path is a trap or a skip", () => {
  assert.equal(recommend([taste("designer", 12, 5)]), null);
  assert.equal(recommend([taste("a", 14, 2), taste("b", 3, 1)]), null);
  assert.equal(recommend([taste("a", 14, 2), taste("b", 6, 4)])?.careerId, "b");
});

test("bad inputs stay in range: energy is clamped and a zero max scores zero skill", () => {
  const [ranked] = rankTastes([taste("x", 5, 9, 0)]);
  assert.equal(ranked!.energy, 5);
  assert.equal(ranked!.skill, 0);
  assert.equal(ranked!.quadrant, "grow");
});
