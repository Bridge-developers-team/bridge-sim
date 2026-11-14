import type { Roadmap, Task } from "../src/api/types";

export function task(id: string, completed = false, minutes = 30): Task {
  return {
    id,
    title: id,
    type: "research",
    estimatedMinutes: minutes,
    whyThisMatters: "",
    instructions: [],
    deliverable: "d",
    successCriteria: "s",
    completed,
  };
}

export function roadmap(weeks: Task[][], careerId = "designer"): Roadmap {
  return {
    id: "r",
    targetCareerId: careerId,
    currentRole: "Teacher",
    targetRole: "Designer",
    track: "balanced",
    hoursPerWeek: 5,
    createdAt: "2026-11-15T00:00:00Z",
    weeks: weeks.map((tasks, i) => ({ week: i + 1, title: `Week ${i + 1}`, objective: "", tasks })),
    assumptions: [],
    cautions: [],
  };
}
