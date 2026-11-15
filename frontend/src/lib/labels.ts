/** Lookup tables from domain values to words and tones. One place to change
 * when a value is added; never inline conditionals at the call site. */
import type { Effort, Mode, TaskType, WorkMode } from "../api/types";
import type { Tone } from "../components/ui/Lozenge";
import type { WeekStatus } from "./progress.ts";

export const EFFORT: Record<Effort, { label: string; tone: Tone }> = {
  lower: { label: "Lower effort", tone: "ok" },
  medium: { label: "Medium effort", tone: "neutral" },
  higher: { label: "Higher effort", tone: "warn" },
  unknown: { label: "Effort unknown", tone: "neutral" },
};

export const WORK_MODE: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "On-site",
  "flexible hours": "Flexible hours",
  "shift work": "Shift work",
  travel: "Travel",
};

export const TASK_TYPE: Record<TaskType, string> = {
  research: "Research",
  learning: "Learning",
  simulation: "Practice",
  portfolio: "Portfolio",
  networking: "Networking",
  application: "Application",
};

export const WEEK_STATUS: Record<WeekStatus, { label: string; tone: Tone }> = {
  "not-started": { label: "Not started", tone: "neutral" },
  "in-progress": { label: "In progress", tone: "warn" },
  completed: { label: "Completed", tone: "ok" },
};

/** Banner text for anything that is not live AI. */
export const MODE_NOTE: Record<Mode, string | null> = {
  live: null,
  demo: "Demo mode: this server has no AI key, so you are seeing labeled sample data, not AI output.",
  sample: "Sample data, not AI: you chose the labeled sample instead of a live AI answer.",
};

export function minutesText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function hoursText(hours: number): string {
  return `${hours} hour${hours === 1 ? "" : "s"} a week`;
}
