/** The user's if-then study plan: which days, what time, from which date.
 * Pure functions (tests/schedule.test.ts). The calendar file is built in the
 * browser and saved by the user; nothing is sent anywhere.
 *
 * Why: people who decide in advance when and where they will act reach their
 * goals more often than people who only intend to (Gollwitzer & Sheeran 2006,
 * 94 studies, d = 0.65). A fixed weekly slot is that decision. */
import type { Roadmap } from "../api/types";

/** One weekly study slot: a weekday (0 = Sunday ... 6 = Saturday) and a
 * local start time, "HH:MM" (24 h). Each day can have its own time. */
export interface Slot {
  day: number;
  time: string;
}

export interface StudySchedule {
  slots: Slot[];
  /** First day of the 30 days, "YYYY-MM-DD". */
  start: string;
}

/** Slots in week order (Monday first). Reads the older one-time-for-all-days
 * shape saved before slots existed. */
export function slotsOf(s: (Partial<StudySchedule> & { days?: number[]; time?: string }) | undefined): Slot[] {
  if (!s) return [];
  const raw = s.slots ?? (s.days ?? []).map((day: number) => ({ day, time: s.time ?? "19:00" }));
  return [...raw].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
}

export interface Session {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  minutes: number;
  week: number;
  title: string;
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const TIMES = ["07:00", "08:00", "12:30", "18:00", "19:00", "20:00", "21:00"];
/** Monday first, the way people plan a week. */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(iso: string): Date {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function parseTime(time: string): [number, number] {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return [h, m];
}

/** The coming Monday (today if it is Monday): a fresh start, the kind of
 * date people find it easier to begin on (Dai, Milkman & Riis 2014). */
export function nextMonday(today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7));
  return isoDate(d);
}

export function timeLabel(time: string): string {
  const [h, m] = parseTime(time);
  const suffix = h < 12 ? "am" : "pm";
  return `${h % 12 || 12}:${pad(m)} ${suffix}`;
}

function joinAnd(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** "Tuesday and Thursday", "Monday, Wednesday and Friday". */
export function daysText(days: number[]): string {
  return joinAnd([...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_NAMES[d]!));
}

/** When, in words: "Tuesday and Thursday at 7:00 pm", or per day when the
 * times differ: "Monday at 7:00 am and Saturday at 10:00 am". */
export function whenText(slots: Slot[]): string {
  const ordered = slotsOf({ slots, start: "" });
  if (ordered.length === 0) return "";
  const times = new Set(ordered.map((x) => x.time));
  if (times.size === 1) return `${daysText(ordered.map((x) => x.day))} at ${timeLabel(ordered[0]!.time)}`;
  return joinAnd(ordered.map((x) => `${DAY_NAMES[x.day]} at ${timeLabel(x.time)}`));
}

/** The plan as one if-then sentence the user can say to themselves. */
export function ifThen(s: StudySchedule): string {
  return `When it's ${whenText(s.slots)}, I open my Bridge plan and do the next task.`;
}

/** Minutes per session: the weekly hours split over the chosen days, in
 * quarter hours, at least 15. */
export function sessionMinutes(hoursPerWeek: number, days: number): number {
  if (days <= 0) return 0;
  return Math.max(15, Math.round((hoursPerWeek * 60) / days / 15) * 15);
}

/** Every study session in the 28 days from the start date. Each is named after
 * the first unfinished task of its week, so the calendar says what to do. */
export function sessions(plan: Roadmap, s: StudySchedule): Session[] {
  const slots = slotsOf(s);
  const minutes = sessionMinutes(plan.hoursPerWeek, slots.length);
  const start = parseDate(s.start);
  const out: Session[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const slot = slots.find((x) => x.day === d.getDay());
    if (!slot) continue;
    const week = Math.min(plan.weeks.length, Math.floor(i / 7) + 1);
    const w = plan.weeks[week - 1];
    const next = w?.tasks.find((t) => !t.completed) ?? w?.tasks[0];
    out.push({ date: isoDate(d), time: slot.time, minutes, week, title: next ? next.title : (w?.title ?? plan.targetRole) });
  }
  return out;
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 characters continue on the next line after a space (RFC 5545). */
function fold(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 73) parts.push((i ? " " : "") + line.slice(i, i + 73));
  return parts.join("\r\n");
}

function stamp(date: string, time: string, plusMinutes = 0): string {
  const [h, m] = parseTime(time);
  const d = parseDate(date);
  d.setHours(h, m + plusMinutes, 0, 0);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** An .ics calendar with one event per session, in the user's local time. */
export function toIcs(plan: Roadmap, list: Session[], link: string, now: Date = new Date()): string {
  const dtstamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = list.flatMap((s, i) => [
    "BEGIN:VEVENT",
    `UID:bridge-${plan.id}-${s.date}-${i}@bridge`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${stamp(s.date, s.time)}`,
    `DTEND:${stamp(s.date, s.time, s.minutes)}`,
    fold(`SUMMARY:${icsText(`Bridge · Week ${s.week}: ${s.title}`)}`),
    fold(`DESCRIPTION:${icsText(`${plan.targetRole} plan. Open it and do the next task: ${link}`)}`),
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Bridge study time",
    "END:VALARM",
    "END:VEVENT",
  ]);
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bridge//Study plan//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].join(
    "\r\n",
  );
}

/** A message the user can send to one person who will ask how it is going.
 * Progress that is reported to someone helps more than progress kept private
 * (Harkin et al. 2016). */
export function buddyMessage(plan: Roadmap, s: StudySchedule | undefined, checkIn: string): string {
  const when = s && s.slots.length ? ` I study ${whenText(s.slots)}.` : "";
  return (
    `I'm working toward a move into ${plan.targetRole}. For the next 30 days I'm following a ${plan.hoursPerWeek}-hour-a-week plan.${when} ` +
    `Could you ask me on ${checkIn} how many tasks I've finished?`
  );
}

/** Days from the start date to a later date, for "check in on" (two weeks in). */
export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function dateLabel(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
