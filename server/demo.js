// DEMO MODE ONLY: used when no ANTHROPIC_API_KEY is set, so the UI can be
// clicked through. Output is fixed template text and a crude word-count
// heuristic, NOT AI. The UI shows a banner whenever this mode is active.

export function demoTasks({ role }) {
  const t = role.title;
  return {
    profile: {
      currentRole: "Your current role (demo mode: resume not read)",
      industry: "your current industry",
      transferableSkills: ["Communication", "Planning", "Working with people under pressure"],
      gaps: [`Core ${t} methods`, "Industry tools for the new role"],
    },
    tasks: [
      {
        title: `First-week problem as a ${t}`,
        scenario: `DEMO TASK (fixed template). You just started as a ${t} in the industry you know. Your manager asks what the biggest problem is in a process you used to be part of.`,
        inputs: "Last quarter: 3 complaints a week, 2 missed deadlines, a team of 8. Budget for fixes: $5,000.",
        deliverable: "A short note: the main problem, why it matters, and two fixes ranked.",
        timeMinutes: 15,
        buildsOn: "Your first-hand view of how the work really happens.",
      },
      {
        title: `Draft a ${t} work artifact`,
        scenario: `DEMO TASK (fixed template). Your team needs a first draft of a typical ${t} deliverable for people you used to work alongside.`,
        inputs: "Audience: 40 frontline staff. Deadline: 2 weeks. They have 20 minutes a week for this.",
        deliverable: "An outline with sections, the goal of each, and how you would check it worked.",
        timeMinutes: 20,
        buildsOn: "You know what your former colleagues need and what they ignore.",
      },
      {
        title: "Recommendation to a busy stakeholder",
        scenario: "DEMO TASK (fixed template). A director has 2 minutes to read your recommendation before a meeting.",
        inputs: "Option A costs $12,000 and takes 1 month. Option B costs $4,000 and takes 3 months.",
        deliverable: "An email of 150 words or less with your recommendation and the one risk to watch.",
        timeMinutes: 10,
        buildsOn: "Your experience explaining decisions to people above you.",
      },
    ],
  };
}

function firstSentence(answer) {
  const s = String(answer).trim().split(/(?<=[.!?])\s+|\n+/).find((x) => x.trim().split(/\s+/).length >= 3);
  return s ? s.trim().split(/\s+/).slice(0, 20).join(" ") : "";
}

export function demoGrade({ answer }) {
  const words = String(answer).trim().split(/\s+/).filter(Boolean).length;
  const base = words < 40 ? 1 : words < 120 ? 2 : 3;
  const evidence = firstSentence(answer);
  const reason = "Demo mode: level from answer length only, not a real grade.";
  return {
    criteria: [
      { id: "problem", level: base, evidence, reason },
      { id: "background", level: Math.max(0, base - 1), evidence, reason },
      { id: "craft", level: base, evidence, reason },
      { id: "clarity", level: words > 300 ? 2 : base, evidence, reason },
    ],
    strength: "Demo mode: no AI feedback. Add an API key to get a real review.",
    topFix: "Demo mode: no AI feedback. Add an API key to get a real review.",
  };
}

export function demoAnswer() {
  return `SAMPLE ANSWER (demo mode, fixed text).
The main problem is that handovers between shifts lose information, which causes most of the 3 weekly complaints.
It matters because each complaint takes a manager about an hour, and two deadlines slipped for the same reason.
Fix 1 (first): a one-page handover checklist, tested with 2 of the 8 people for two weeks. Cost: almost nothing.
Fix 2: a short weekly review of complaints to spot patterns, using part of the $5,000 for a simple shared tracker.
I would check success by counting complaints per week before and after.`;
}
