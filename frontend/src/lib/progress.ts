/** Roadmap progress, in the browser next to the ticks. The plan's own rules
 * (time cap, quick start, ids) are enforced by the server in
 * backend/src/bridge/domain/roadmap.py. Pure functions; tests/progress.test.ts. */
import type { Roadmap, Task, Week } from "../api/types";

export type WeekStatus = "not-started" | "in-progress" | "completed";

export function allTasks(roadmap: Roadmap): Task[] {
  return roadmap.weeks.flatMap((w) => w.tasks);
}

/** Progress = completed tasks / total tasks. Nothing else. */
export function progress(roadmap: Roadmap): { done: number; total: number; percent: number } {
  const tasks = allTasks(roadmap);
  const done = tasks.filter((t) => t.completed).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

export function weekStatus(week: Week): WeekStatus {
  const done = week.tasks.filter((t) => t.completed).length;
  if (done === 0) return "not-started";
  return done === week.tasks.length ? "completed" : "in-progress";
}

export function weekMinutes(week: Week): number {
  return week.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
}

/** First unfinished task in plan order, or null when everything is done. */
export function nextAction(roadmap: Roadmap): { week: number; task: Task } | null {
  for (const week of roadmap.weeks) {
    const task = week.tasks.find((t) => !t.completed);
    if (task) return { week: week.week, task };
  }
  return null;
}

export function findTask(roadmap: Roadmap, taskId: string): { week: number; task: Task } | null {
  for (const week of roadmap.weeks) {
    const task = week.tasks.find((t) => t.id === taskId);
    if (task) return { week: week.week, task };
  }
  return null;
}

export function setTaskCompleted(roadmap: Roadmap, taskId: string, completed: boolean): Roadmap {
  return {
    ...roadmap,
    weeks: roadmap.weeks.map((w) => ({
      ...w,
      tasks: w.tasks.map((t) => (t.id === taskId ? { ...t, completed } : t)),
    })),
  };
}

/** Carry ticks from an old plan to a regenerated one, by task id. `lost` is
 * how many ticked tasks no longer exist, so the UI can say so. */
export function mergeProgress(oldRoadmap: Roadmap, newRoadmap: Roadmap): { roadmap: Roadmap; kept: number; lost: number } {
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
