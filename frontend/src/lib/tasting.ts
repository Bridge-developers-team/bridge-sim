/** Career tasting: the user tries a 10-minute task from each path, then says
 * how they would feel doing it on an ordinary Tuesday. This module turns
 * those two signals into the Taste Map and a recommendation. Pure functions,
 * tests in tests/tasting.test.ts.
 *
 * Skill comes from the rubric score the server signed; energy is the user's
 * own answer. Energy weighs more than skill on purpose: skill can be learned
 * in a 30-day plan, wanting to do the work cannot. */

export type Quadrant = "thrive" | "grow" | "trap" | "skip";

export interface Taste {
  careerId: string;
  title: string;
  score: number;
  maxScore: number;
  /** 1 = dreading it ... 5 = would love it */
  energy: number;
}

export interface RankedTaste extends Taste {
  skill: number; // 0..1
  quadrant: Quadrant;
  fit: number; // 0..1, used only to order tastes inside a quadrant
  reason: string;
}

export const ENERGY_LABELS: Record<number, string> = {
  1: "Dreading it",
  2: "Rather not",
  3: "It's fine",
  4: "I'd like it",
  5: "I'd love it",
};

/** A rubric share of 60% or more counts as strong for a first attempt. */
export const SKILL_HIGH = 0.6;
/** "I'd like it" or better. "It's fine" is not enough to change careers for. */
export const ENERGY_HIGH = 4;
export const MIN_TASTES_TO_RECOMMEND = 2;

const ORDER: Record<Quadrant, number> = { thrive: 0, grow: 1, trap: 2, skip: 3 };

export const QUADRANT_LABEL: Record<Quadrant, string> = {
  thrive: "Thrive",
  grow: "Grow into",
  trap: "Trap",
  skip: "Skip",
};

export function skillShare(t: Pick<Taste, "score" | "maxScore">): number {
  if (!(t.maxScore > 0)) return 0;
  return Math.min(1, Math.max(0, t.score / t.maxScore));
}

export function clampEnergy(energy: number): number {
  return Math.min(5, Math.max(1, Math.round(energy)));
}

export function quadrantOf(skill: number, energy: number): Quadrant {
  const strong = skill >= SKILL_HIGH;
  const wanted = clampEnergy(energy) >= ENERGY_HIGH;
  if (strong && wanted) return "thrive";
  if (wanted) return "grow";
  if (strong) return "trap";
  return "skip";
}

function reasonFor(t: Taste, quadrant: Quadrant): string {
  const score = `${t.score}/${t.maxScore}`;
  const feel = `"${ENERGY_LABELS[clampEnergy(t.energy)]}"`;
  switch (quadrant) {
    case "thrive":
      return `You scored ${score} and said ${feel}. Skill and energy both point here.`;
    case "grow":
      return `You said ${feel} but scored ${score}. The gap is skill, and a 30-day plan can close it.`;
    case "trap":
      return `You scored ${score} but said ${feel}. Being good at work that drains you is often why people leave.`;
    case "skip":
      return `You scored ${score} and said ${feel}. Neither signal points here for now.`;
  }
}

export function rankTastes(tastes: Taste[]): RankedTaste[] {
  return tastes
    .map((t) => {
      const skill = skillShare(t);
      const energy = clampEnergy(t.energy);
      const quadrant = quadrantOf(skill, energy);
      const fit = 0.6 * ((energy - 1) / 4) + 0.4 * skill;
      return { ...t, energy, skill, quadrant, fit, reason: reasonFor(t, quadrant) };
    })
    .sort((a, b) => ORDER[a.quadrant] - ORDER[b.quadrant] || b.fit - a.fit || a.title.localeCompare(b.title));
}

/** The path to recommend, or null: never before two tastes, and never a path
 * the user would not want to do (trap or skip), however well they scored. */
export function recommend(tastes: Taste[]): RankedTaste | null {
  if (tastes.length < MIN_TASTES_TO_RECOMMEND) return null;
  const best = rankTastes(tastes)[0];
  return best && (best.quadrant === "thrive" || best.quadrant === "grow") ? best : null;
}
