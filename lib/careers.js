// Career-path checks in plain code. The AI proposes 3 paths; here we drop
// near-duplicates, bound the lists, and check that every "skill you already
// have" quotes the user's own resume. A skill whose quote is not in the
// resume stays visible but is labeled as an AI inference.
import { verifyEvidence, normalize } from "./scoring.js";
import { EFFORTS, slug } from "./roadmap.js";

function text(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function list(value, maxItems, maxLen = 120) {
  return (Array.isArray(value) ? value : []).map((v) => text(v, maxLen)).filter(Boolean).slice(0, maxItems);
}

// "Senior Instructional Designer (Corporate)" and "instructional designer"
// count as the same path.
export function titleKey(title) {
  return normalize(title)
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(senior|junior|entry[- ]level|associate|lead|corporate|specialist)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCareer(raw, resumeText) {
  const title = text(raw?.title, 80);
  if (!title) return null;
  const transferableSkills = (Array.isArray(raw?.transferableSkills) ? raw.transferableSkills : [])
    .map((s) => {
      const skill = text(s?.skill, 60);
      const evidence = text(s?.evidence, 300);
      const verified = Boolean(resumeText) && verifyEvidence(resumeText, evidence);
      return skill ? { skill, evidence: verified ? evidence : "", verified } : null;
    })
    .filter(Boolean)
    .slice(0, 4);
  return {
    id: slug(title),
    title,
    roleSummary: text(raw?.roleSummary, 300),
    fitExplanation: text(raw?.fitExplanation, 500),
    transferableSkills,
    missingSkills: list(raw?.missingSkills, 4),
    relativeEffort: EFFORTS.includes(raw?.relativeEffort) ? raw.relativeEffort : "unknown",
    keyTradeoff: text(raw?.keyTradeoff, 300),
    assumptions: list(raw?.assumptions, 3, 300),
  };
}

// Returns exactly 3 distinct careers, or throws when the AI gave fewer.
export function normalizeCareers(rawCareers, resumeText) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(rawCareers) ? rawCareers : []) {
    const c = normalizeCareer(raw, resumeText);
    if (!c) continue;
    const key = titleKey(c.title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length === 3) break;
  }
  if (out.length < 3) throw new Error("Need 3 distinct career paths.");
  return out;
}

export function normalizeYears(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n) || n < 0 || n > 60) return null;
  return Math.round(n);
}
