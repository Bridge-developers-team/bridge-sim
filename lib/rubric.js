// Fixed hiring-manager rubric. The LLM only picks a level (0-4) per criterion
// and quotes evidence; weights, totals and bands are computed in lib/scoring.js.

export const RUBRIC = [
  {
    id: "problem",
    name: "Gets the real problem",
    weight: 0.3,
    levels: [
      "Misreads the task or answers a different question.",
      "Restates the task but misses the main constraint or goal.",
      "Addresses the main goal; misses a key constraint or stakeholder.",
      "Addresses the goal and the key constraints; priorities are sensible.",
      "Frames the problem sharply, names trade-offs and what matters most first.",
    ],
  },
  {
    id: "background",
    name: "Uses your background",
    weight: 0.2,
    levels: [
      "No sign of prior work or studies; generic answer.",
      "Mentions prior work or studies without using them.",
      "Uses one relevant detail, method or idea from prior work or studies.",
      "Prior work or studies clearly improve the answer (realistic details, sound methods, known pitfalls).",
      "Turns what they already know into an advantage a typical entry-level hire would not have.",
    ],
  },
  {
    id: "craft",
    name: "Craft of the deliverable",
    weight: 0.3,
    levels: [
      "No usable deliverable.",
      "Deliverable is incomplete or would need a full rewrite.",
      "Usable draft; needs significant edits before it could be used at work.",
      "Solid work a manager could use after light edits; uses the role's basic methods.",
      "Polished work using the role's methods well; ready to use.",
    ],
  },
  {
    id: "clarity",
    name: "Clear for a busy manager",
    weight: 0.2,
    levels: [
      "Hard to follow.",
      "Main point is buried.",
      "Understandable but wordy or unstructured.",
      "Clear structure; main point is easy to find.",
      "Concise, well structured, ends with a clear next step or decision.",
    ],
  },
];

export const BANDS = [
  { min: 80, label: "Strong signal", note: "You already do this work at a level a hiring manager would notice." },
  { min: 60, label: "Hire-ready with coaching", note: "Real foundation. Focused practice closes the gap." },
  { min: 40, label: "Getting there", note: "The instinct is there; the role's methods are not yet." },
  { min: 0, label: "Not yet", note: "Big gap today. Try a closer role or plan more learning time." },
];

export const RUBRIC_IDS = RUBRIC.map((c) => c.id);
