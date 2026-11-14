// Practice-task scoring in plain code. The AI proposes a score, a quote from
// the answer, strengths and improvements per rubric criterion; this file
// clamps the score, checks the quote really appears in the answer, and caps
// unproven scores. Shared by the server, the browser and the tests.
import { verifyEvidence } from "./scoring.js";

export const UNPROVEN_SCORE_CAP = 1;
const MIN_CRITERIA = 3;
const MAX_CRITERIA = 4;

function text(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function list(value, maxItems, maxLen = 300) {
  return (Array.isArray(value) ? value : []).map((v) => text(v, maxLen)).filter(Boolean).slice(0, maxItems);
}

function clampInt(value, lo, hi) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

// 3-4 criteria with app-assigned ids c1..c4 and an integer max score of 3-5.
export function normalizeRubric(rubric) {
  const out = (Array.isArray(rubric) ? rubric : [])
    .map((c) => ({ label: text(c?.label, 80), description: text(c?.description, 300), maxScore: clampInt(c?.maxScore, 3, 5) }))
    .filter((c) => c.label && c.description)
    .slice(0, MAX_CRITERIA)
    .map((c, i) => ({ id: `c${i + 1}`, ...c }));
  if (out.length < MIN_CRITERIA) throw new Error("A practice rubric needs at least 3 criteria.");
  return out;
}

export function normalizeSimulation(raw, { id, targetRole }) {
  const sim = {
    id,
    targetRole: text(targetRole, 120),
    scenario: text(raw?.scenario, 1500),
    brief: text(raw?.brief, 1200),
    expectedDeliverable: text(raw?.expectedDeliverable, 400),
    timeboxMinutes: clampInt(raw?.timeboxMinutes, 5, 20),
    rubric: normalizeRubric(raw?.rubric),
  };
  if (!sim.scenario || !sim.brief || !sim.expectedDeliverable) throw new Error("Practice task is missing its scenario, brief or deliverable.");
  return sim;
}

// raw: { criteria: [{ rubricId, score, evidence, strengths, improvements }], overallFeedback, nextRevisionStep }
export function scoreEvaluation(answer, simulation, raw) {
  const byId = new Map((raw?.criteria ?? []).map((c) => [c?.rubricId, c]));
  const criteria = simulation.rubric.map((r, i) => {
    const c = byId.get(r.id) ?? raw?.criteria?.[i] ?? {};
    const scoreRaw = clampInt(c.score, 0, r.maxScore);
    const verified = verifyEvidence(answer, c.evidence);
    const score = !verified && scoreRaw > UNPROVEN_SCORE_CAP ? UNPROVEN_SCORE_CAP : scoreRaw;
    return {
      rubricId: r.id,
      label: r.label,
      score,
      scoreRaw,
      maxScore: r.maxScore,
      verified,
      evidence: verified ? text(c.evidence, 400) : "",
      strengths: list(c.strengths, 3),
      improvements: list(c.improvements, 3),
    };
  });
  return {
    simulationId: simulation.id,
    feedbackType: "ai_practice_feedback",
    criteria,
    totalScore: criteria.reduce((s, c) => s + c.score, 0),
    maxTotal: criteria.reduce((s, c) => s + c.maxScore, 0),
    overallFeedback: text(raw?.overallFeedback, 800),
    nextRevisionStep: text(raw?.nextRevisionStep, 400),
  };
}
