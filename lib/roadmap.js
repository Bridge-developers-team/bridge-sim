// 30-day roadmap rules in plain code, shared by the server, the browser and
// the tests. The AI proposes weeks and tasks; this file owns everything that
// must be true no matter what the AI wrote:
// - exactly 4 weeks, 1-4 tasks each, every task with a deliverable and a
//   success criterion;
// - weekly minutes never above hoursPerWeek x 60;
// - week 1 starts with an in-app practice task of 10 minutes or less;
// - stable task ids, so progress survives a reload or a regenerated plan.

export const TASK_TYPES = ["research", "learning", "simulation", "portfolio", "networking", "application"];
export const TRACKS = ["safe", "balanced", "fast"];
export const EFFORTS = ["lower", "medium", "higher", "unknown"];
export const QUICK_TASK_MAX_MIN = 10;
export const MIN_HOURS = 1;
export const MAX_HOURS = 40;
const MAX_TASKS_PER_WEEK = 4;

// share = how much of the weekly time the plan aims to use. The hard cap is
// always 100%; the share is a hint to the AI and to the demo templates.
export const TRACK_INFO = {
  safe: {
    label: "Safe Track",
    share: 0.75,
    summary: "Keep your job and income. Smaller weekly blocks, free resources, adjacent roles first.",
  },
  balanced: {
    label: "Balanced Track",
    share: 0.9,
    summary: "A steady middle path: learn one core skill, build one piece of evidence, start talking to people.",
  },
  fast: {
    label: "Fast Track",
    share: 1,
    summary: "Uses all your weekly hours and starts portfolio and applications earlier. Often needs more time or paid learning.",
  },
};

export function slug(text) {
  const s = String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 48)
    .replace(/-+$/, "");
  return s || "item";
}

export function clampHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 5;
  return Math.min(MAX_HOURS, Math.max(MIN_HOURS, Math.round(n * 2) / 2));
}

export function clampMinutes(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 30;
  return Math.min(600, Math.max(5, n));
}

export function normalizeTrack(value) {
  return TRACKS.includes(value) ? value : "balanced";
}

function text(value, max = 600) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function list(value, maxItems, maxLen = 300) {
  return (Array.isArray(value) ? value : []).map((v) => text(v, maxLen)).filter(Boolean).slice(0, maxItems);
}

// One AI task -> a clean task, or null when it lacks the required parts.
export function normalizeTask(raw) {
  if (!raw || typeof raw !== "object") return null;
  const task = {
    title: text(raw.title, 120),
    type: TASK_TYPES.includes(raw.type) ? raw.type : "learning",
    estimatedMinutes: clampMinutes(raw.estimatedMinutes),
    whyThisMatters: text(raw.whyThisMatters, 400),
    instructions: list(raw.instructions, 6, 300),
    deliverable: text(raw.deliverable, 300),
    successCriteria: text(raw.successCriteria, 300),
    completed: false,
  };
  if (!task.title || !task.deliverable || !task.successCriteria) return null;
  return task;
}

// The in-app practice task the app adds when week 1 lacks a quick one.
export function quickStartTask(targetRole) {
  return {
    title: `Try a 10-minute ${targetRole} practice task`,
    type: "simulation",
    estimatedMinutes: QUICK_TASK_MAX_MIN,
    whyThisMatters: "One small, realistic task shows you what the work feels like before you put more time into this path.",
    instructions: [
      "Open the practice task from this card.",
      "Read the scenario and the scoring rubric before you write.",
      "Write a short answer. It does not need to be perfect.",
    ],
    deliverable: "One short written answer to a realistic work scenario",
    successCriteria: "You submitted an answer and read the practice feedback for every rubric criterion.",
    completed: false,
  };
}

// Keep tasks in order while they fit the weekly budget. Never returns an
// empty week: if even the first task is too long, it is shortened to fit.
export function fitWeekToBudget(tasks, budgetMinutes) {
  const kept = [];
  const dropped = [];
  let used = 0;
  for (const t of tasks) {
    if (kept.length < MAX_TASKS_PER_WEEK && used + t.estimatedMinutes <= budgetMinutes) {
      kept.push(t);
      used += t.estimatedMinutes;
    } else dropped.push(t);
  }
  let shortened = false;
  if (kept.length === 0 && tasks.length > 0) {
    kept.push({ ...tasks[0], estimatedMinutes: budgetMinutes });
    dropped.splice(dropped.indexOf(tasks[0]), 1);
    used = budgetMinutes;
    shortened = true;
  }
  return { tasks: kept, dropped, used, shortened };
}

// Week 1: make sure an in-app practice task of <= 10 minutes comes first.
function withQuickStart(tasks, targetRole) {
  const out = [...tasks];
  let i = out.findIndex((t) => t.type === "simulation" && t.estimatedMinutes <= QUICK_TASK_MAX_MIN);
  if (i < 0) i = out.findIndex((t) => t.type === "simulation");
  if (i >= 0) {
    // The in-app practice task is timeboxed to 10 minutes.
    const [sim] = out.splice(i, 1);
    out.unshift({ ...sim, estimatedMinutes: Math.min(sim.estimatedMinutes, QUICK_TASK_MAX_MIN) });
  } else out.unshift(quickStartTask(targetRole));
  return out;
}

function uniqueId(base, used) {
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

// raw: AI output { weeks: [{ title, objective, tasks: [...] }], assumptions, cautions }
// ctx: { id, candidateId, career: { id, title }, currentRole, track, hoursPerWeek, createdAt }
export function buildRoadmap(raw, ctx) {
  const hours = clampHours(ctx.hoursPerWeek);
  const budget = hours * 60;
  const targetRole = text(ctx.career?.title, 120) || "new role";
  const rawWeeks = Array.isArray(raw?.weeks) ? raw.weeks.slice(0, 4) : [];
  if (rawWeeks.length < 4) throw new Error("A roadmap needs 4 weeks.");
  const cautions = list(raw?.cautions, 6);
  const usedIds = new Set();

  const weeks = rawWeeks.map((w, i) => {
    let tasks = (Array.isArray(w?.tasks) ? w.tasks : []).map(normalizeTask).filter(Boolean);
    if (i === 0) tasks = withQuickStart(tasks, targetRole);
    const fit = fitWeekToBudget(tasks, budget);
    if (fit.dropped.length) {
      cautions.push(`Week ${i + 1}: ${fit.dropped.length} suggested task${fit.dropped.length === 1 ? " was" : "s were"} left out to keep the week within ${hours} hours.`);
    }
    if (fit.shortened) cautions.push(`Week ${i + 1}: the main task was shortened to fit ${hours} hours. Consider adding time if you can.`);
    const week = i + 1;
    return {
      week,
      title: text(w?.title, 100) || `Week ${week}`,
      objective: text(w?.objective, 300),
      tasks: fit.tasks.map((t) => {
        const id = uniqueId(`w${week}-${slug(t.title)}`, usedIds);
        return t.type === "simulation" ? { ...t, id, simulationId: id } : { ...t, id };
      }),
    };
  });

  return {
    id: ctx.id,
    candidateId: ctx.candidateId,
    targetCareerId: ctx.career?.id ?? slug(targetRole),
    currentRole: text(ctx.currentRole, 120) || "Your current role",
    targetRole,
    track: normalizeTrack(ctx.track),
    hoursPerWeek: hours,
    createdAt: ctx.createdAt,
    weeks,
    assumptions: list(raw?.assumptions, 6),
    cautions,
  };
}

export function allTasks(roadmap) {
  return (roadmap?.weeks ?? []).flatMap((w) => w.tasks);
}

export function weekMinutes(week) {
  return week.tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
}

// Progress = completed tasks / total tasks. Nothing else.
export function progress(roadmap) {
  const tasks = allTasks(roadmap);
  const done = tasks.filter((t) => t.completed).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export function weekStatus(week) {
  const done = week.tasks.filter((t) => t.completed).length;
  if (done === 0) return "not-started";
  return done === week.tasks.length ? "completed" : "in-progress";
}

// First unfinished task in plan order, or null when everything is done.
export function nextAction(roadmap) {
  for (const week of roadmap?.weeks ?? []) {
    const task = week.tasks.find((t) => !t.completed);
    if (task) return { week: week.week, task };
  }
  return null;
}

export function setTaskCompleted(roadmap, taskId, completed) {
  return {
    ...roadmap,
    weeks: roadmap.weeks.map((w) => ({
      ...w,
      tasks: w.tasks.map((t) => (t.id === taskId ? { ...t, completed: Boolean(completed) } : t)),
    })),
  };
}

export function findTask(roadmap, taskId) {
  for (const week of roadmap?.weeks ?? []) {
    const task = week.tasks.find((t) => t.id === taskId);
    if (task) return { week: week.week, task };
  }
  return null;
}

// Carry completed ticks from an old plan to a regenerated one by task id.
export function mergeProgress(oldRoadmap, newRoadmap) {
  const doneIds = new Set(allTasks(oldRoadmap).filter((t) => t.completed).map((t) => t.id));
  const newIds = new Set(allTasks(newRoadmap).map((t) => t.id));
  let kept = 0;
  const weeks = newRoadmap.weeks.map((w) => ({
    ...w,
    tasks: w.tasks.map((t) => {
      if (!doneIds.has(t.id)) return t;
      kept++;
      return { ...t, completed: true };
    }),
  }));
  const lost = [...doneIds].filter((id) => !newIds.has(id)).length;
  return { roadmap: { ...newRoadmap, weeks }, kept, lost };
}

// Everything that must hold for a roadmap. Returns a list of problems (empty = OK).
export function checkRoadmap(roadmap) {
  const problems = [];
  if (!roadmap || roadmap.weeks?.length !== 4) return ["Roadmap must have exactly 4 weeks."];
  const budget = roadmap.hoursPerWeek * 60;
  const ids = new Set();
  for (const w of roadmap.weeks) {
    if (w.tasks.length < 1 || w.tasks.length > MAX_TASKS_PER_WEEK) problems.push(`Week ${w.week} has ${w.tasks.length} tasks.`);
    if (weekMinutes(w) > budget) problems.push(`Week ${w.week} needs ${weekMinutes(w)} min, over the ${budget} min available.`);
    for (const t of w.tasks) {
      if (!t.id || ids.has(t.id)) problems.push(`Task id missing or repeated: ${t.id}`);
      ids.add(t.id);
      for (const f of ["title", "deliverable", "successCriteria"]) if (!t[f]) problems.push(`Task ${t.id} has no ${f}.`);
      if (!TASK_TYPES.includes(t.type)) problems.push(`Task ${t.id} has unknown type ${t.type}.`);
      if (!(t.estimatedMinutes > 0)) problems.push(`Task ${t.id} has no time estimate.`);
    }
  }
  const week1 = roadmap.weeks[0].tasks;
  if (!week1.some((t) => t.estimatedMinutes <= QUICK_TASK_MAX_MIN)) problems.push("Week 1 has no task of 10 minutes or less.");
  return problems;
}
