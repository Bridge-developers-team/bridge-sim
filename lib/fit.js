// Bridge Map logic: plain code, shared by server, browser and tests.
// The AI only proposes skills (from the fixed taxonomy) with a level and a quote.
// Here we check every quote against the user's own text, then score how well
// each role fits and how many study hours the gaps would take.
import { verifyEvidence, clampLevel, UNVERIFIED_CAP, normalize } from "./scoring.js";

const MAX_SKILL_LEVEL = 3;

// extracted: [{ id, level, evidence }] from the AI. skillIds: allowed ids.
// Returns one entry per known skill id (highest level wins), with the level
// capped at 1 when the quote is not found in the user's text.
export function verifySkills(sourceText, extracted, skillIds) {
  const allowed = new Set(skillIds);
  const best = new Map();
  for (const s of extracted ?? []) {
    if (!allowed.has(s?.id)) continue;
    const levelRaw = Math.min(MAX_SKILL_LEVEL, clampLevel(s.level));
    if (levelRaw === 0) continue;
    const verified = verifyEvidence(sourceText, s.evidence);
    const level = !verified && levelRaw > UNVERIFIED_CAP ? UNVERIFIED_CAP : levelRaw;
    const entry = { id: s.id, levelRaw, level, verified, evidence: String(s.evidence ?? "") };
    const prev = best.get(s.id);
    if (!prev || entry.level > prev.level || (entry.level === prev.level && entry.verified && !prev.verified)) {
      best.set(s.id, entry);
    }
  }
  return [...best.values()].sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
}

export function levelMap(verifiedSkills) {
  const map = {};
  for (const s of verifiedSkills ?? []) map[s.id] = s.level;
  return map;
}

// Fit = weighted share of each required level the person already has (0-100).
export function roleFit(role, levels, skillsCatalog) {
  const hoursById = new Map(skillsCatalog.map((s) => [s.id, s.hoursPerLevel]));
  let got = 0;
  let total = 0;
  const matched = [];
  const gaps = [];
  for (const need of role.needs) {
    const have = Math.min(levels[need.skill] ?? 0, need.level);
    got += (have / need.level) * need.weight;
    total += need.weight;
    if (have >= need.level) matched.push({ skill: need.skill, have: levels[need.skill] ?? 0, need: need.level });
    else {
      const missing = need.level - have;
      gaps.push({ skill: need.skill, have, need: need.level, hours: missing * (hoursById.get(need.skill) ?? 40) });
    }
  }
  const gapHours = gaps.reduce((s, g) => s + g.hours, 0);
  return { fit: total ? Math.round((got / total) * 100) : 0, matched, gaps, gapHours };
}

// True when the user's "curious about" text mentions one of the role's tags.
export function interestMatch(role, interestText) {
  const text = " " + normalize(interestText).replace(/[^a-z0-9&+ ]/g, " ").replace(/\s+/g, " ") + " ";
  if (text.trim() === "") return false;
  return (role.tags ?? []).some((tag) => text.includes(" " + normalize(tag) + " "));
}

// Ranked list for the Bridge Map: best fit first; ties go to roles the user
// said they are curious about, then to fewer gap hours.
export function rankRoles(roles, levels, skillsCatalog, interestText = "") {
  return roles
    .map((role) => ({ roleId: role.id, curious: interestMatch(role, interestText), ...roleFit(role, levels, skillsCatalog) }))
    .sort((a, b) => b.fit - a.fit || Number(b.curious) - Number(a.curious) || a.gapHours - b.gapHours);
}
