/** The user's journey as plain data, and every way it can change. Pure
 * functions only (tests/journey.test.ts); src/state/journey.ts stores it.
 *
 * Saved in localStorage: profile (no income), career paths, the chosen path,
 * the roadmap with ticks, practice work, career tastings. NOT saved: the resume text, income
 * figures. Those live in memory for one visit. */
import type { CareersResponse, Evaluation, Mode, Practice, Profile, Resource, Roadmap } from "../api/types";
import { mergeProgress, setTaskCompleted } from "./progress.ts";
import type { Taste } from "./tasting.ts";

export const JOURNEY_VERSION = 2;

export interface PracticeWork {
  practice: Practice;
  practiceToken: string;
  mode: Mode;
  answer: string;
  evaluation?: Evaluation;
  resultToken?: string;
  evaluationMode?: Mode;
  proof?: { id: string; deleteKey: string };
}

/** A 10-minute taste of one career path, plus how the user felt about it. */
export interface Tasting extends PracticeWork {
  energy?: number;
}

export interface Journey {
  version: typeof JOURNEY_VERSION;
  profile: Profile;
  careers?: CareersResponse;
  careerId?: string;
  roadmap?: Roadmap;
  roadmapMode?: Mode;
  practices: Record<string, PracticeWork>;
  /** Keyed by career id. Kept when a path is chosen or a plan rebuilt. */
  tastings: Record<string, Tasting>;
  /** Learning links per plan week, keyed `${roadmapId}:${week}`. */
  resources: Record<string, { items: Resource[]; mode: Mode }>;
}

export const DEFAULT_PROFILE: Profile = {
  currentRole: "",
  yearsExperience: null,
  changeMotivation: [],
  hoursPerWeek: 5,
  monthlyLearningBudget: 0,
  currency: "USD",
  location: "",
  country: "us",
  interestedRoles: [],
  transitionPreference: "balanced",
};

export function emptyJourney(): Journey {
  return { version: JOURNEY_VERSION, profile: { ...DEFAULT_PROFILE }, practices: {}, tastings: {}, resources: {} };
}

/** New career paths start a new journey: the old plan and practice belong to
 * a path that may no longer be on screen. */
export function withCareers(j: Journey, careers: CareersResponse): Journey {
  return { ...j, careers, careerId: undefined, roadmap: undefined, roadmapMode: undefined, practices: {}, tastings: {}, resources: {} };
}

export function chooseCareer(j: Journey, careerId: string): Journey {
  const keepPlan = j.roadmap?.targetCareerId === careerId;
  return {
    ...j,
    careerId,
    roadmap: keepPlan ? j.roadmap : undefined,
    roadmapMode: keepPlan ? j.roadmapMode : undefined,
    practices: keepPlan ? j.practices : {},
  };
}

/** A regenerated plan for the same path keeps ticks for tasks that still exist. */
export function withRoadmap(j: Journey, roadmap: Roadmap, mode: Mode): { journey: Journey; kept: number; lost: number } {
  if (j.roadmap && j.roadmap.targetCareerId === roadmap.targetCareerId) {
    const merged = mergeProgress(j.roadmap, roadmap);
    return { journey: { ...j, roadmap: merged.roadmap, roadmapMode: mode }, kept: merged.kept, lost: merged.lost };
  }
  return { journey: { ...j, roadmap, roadmapMode: mode, practices: {} }, kept: 0, lost: 0 };
}

export function setDone(j: Journey, taskId: string, done: boolean): Journey {
  return j.roadmap ? { ...j, roadmap: setTaskCompleted(j.roadmap, taskId, done) } : j;
}

export function withPractice(j: Journey, taskId: string, work: PracticeWork): Journey {
  return { ...j, practices: { ...j.practices, [taskId]: work } };
}

export function updatePractice(j: Journey, taskId: string, patch: Partial<PracticeWork>): Journey {
  const current = j.practices[taskId];
  return current ? withPractice(j, taskId, { ...current, ...patch }) : j;
}

/** Feedback received = the practice task is done. */
export function withEvaluation(
  j: Journey,
  taskId: string,
  result: { answer: string; evaluation: Evaluation; resultToken: string; mode: Mode },
): Journey {
  const next = updatePractice(j, taskId, {
    answer: result.answer,
    evaluation: result.evaluation,
    resultToken: result.resultToken,
    evaluationMode: result.mode,
    proof: undefined, // a new grade is a new result; an old proof page stays as published
  });
  return setDone(next, taskId, true);
}

export function withTasting(j: Journey, careerId: string, work: Tasting): Journey {
  return { ...j, tastings: { ...j.tastings, [careerId]: work } };
}

export function updateTasting(j: Journey, careerId: string, patch: Partial<Tasting>): Journey {
  const current = j.tastings[careerId];
  return current ? withTasting(j, careerId, { ...current, ...patch }) : j;
}

/** Graded tastings that also have an energy answer: what the Taste Map plots. */
export function tastesOf(j: Journey): Taste[] {
  return (j.careers?.careers ?? []).flatMap((career) => {
    const t = j.tastings[career.id];
    if (!t?.evaluation || t.energy === undefined) return [];
    return [
      {
        careerId: career.id,
        title: career.title,
        score: t.evaluation.totalScore,
        maxScore: t.evaluation.maxTotal,
        energy: t.energy,
      },
    ];
  });
}

export function selectedCareer(j: Journey) {
  return j.careers?.careers.find((c) => c.id === j.careerId);
}

/** Read saved state; anything unreadable or from an older version starts fresh. */
export function parseJourney(raw: string | null): Journey {
  if (!raw) return emptyJourney();
  try {
    const data = JSON.parse(raw) as Partial<Journey>;
    if (data.version !== JOURNEY_VERSION || typeof data.profile !== "object" || !data.profile) return emptyJourney();
    return { ...emptyJourney(), ...data, profile: { ...DEFAULT_PROFILE, ...data.profile } } as Journey;
  } catch {
    return emptyJourney();
  }
}
