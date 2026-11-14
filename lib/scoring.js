// Quote checks in plain code: the AI must quote the user's own text, and
// anything it claims without a real quote is capped.

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
