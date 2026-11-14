// Deterministic scoring. The LLM returns a level and an evidence quote per
// criterion; everything here is plain code so the score is explainable.
import { RUBRIC, BANDS } from "./rubric.js";

const MAX_LEVEL = 4;
// A level above this needs a quote that really appears in the answer.
export const UNVERIFIED_CAP = 1;

export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function stripEdgePunctuation(text) {
  return text.replace(/^[\s"'.,;:!?…-]+|[\s"'.,;:!?…-]+$/g, "");
}

// True when the quote (at least 3 words) appears verbatim in the answer,
// ignoring case, whitespace, smart quotes and leading/trailing punctuation.
export function verifyEvidence(answer, quote) {
  const q = stripEdgePunctuation(normalize(quote));
  if (q.split(" ").filter(Boolean).length < 3) return false;
  return normalize(answer).includes(q);
}

export function clampLevel(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_LEVEL, Math.max(0, n));
}

export function bandFor(score) {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

// criteria: [{ id, level, evidence, reason }] from the grader.
// Returns per-criterion results plus a 0-100 score and band.
export function scoreTask(answer, criteria, rubric = RUBRIC) {
  const byId = new Map((criteria ?? []).map((c) => [c.id, c]));
  const results = rubric.map((r) => {
    const c = byId.get(r.id) ?? { level: 0, evidence: "", reason: "Not graded." };
    const levelRaw = clampLevel(c.level);
    const verified = verifyEvidence(answer, c.evidence);
    const level = !verified && levelRaw > UNVERIFIED_CAP ? UNVERIFIED_CAP : levelRaw;
    return {
      id: r.id,
      name: r.name,
      weight: r.weight,
      levelRaw,
      level,
      verified,
      evidence: c.evidence ?? "",
      reason: c.reason ?? "",
      descriptor: r.levels[level],
    };
  });
  const totalWeight = rubric.reduce((s, r) => s + r.weight, 0);
  const weighted = results.reduce((s, r) => s + (r.level / MAX_LEVEL) * r.weight, 0);
  const score = Math.round((weighted / totalWeight) * 100);
  return { criteria: results, score, band: bandFor(score).label };
}

export function overallScore(taskScores) {
  const valid = taskScores.filter((s) => Number.isFinite(s));
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
