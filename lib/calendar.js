// Turn the roadmap into calendar events. Plain code, shared by the browser
// and the tests. No Google sign-in: the user either opens a prefilled
// Google Calendar event per task, or imports one .ics file with all tasks.
//
// Times are "floating" local times (no time zone), so Google Calendar places
// them in the user's own calendar time zone.

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n) {
  return String(n).padStart(2, "0");
}

// Local midnight of the given date.
export function dayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n, date.getHours(), date.getMinutes());
}

// "today" | "tomorrow" | "monday" -> local midnight.
export function startDateFor(choice, now = new Date()) {
  const today = dayStart(now);
  if (choice === "today") return today;
  if (choice === "monday") {
    const ahead = (8 - today.getDay()) % 7 || 7;
    return addDays(today, ahead);
  }
  return addDays(today, 1);
}

// Spread each roadmap week's tasks over the chosen study days of that
// calendar week (days 1-7, 8-14, ...). Each task goes to the least-loaded
// study day; tasks on the same day follow each other from startHour.
// opts: { startDate, days: [0-6], startHour, includeCompleted }
export function scheduleTasks(roadmap, { startDate, days, startHour = 19, includeCompleted = false }) {
  const studyDays = [...new Set(days)].filter((d) => d >= 0 && d <= 6);
  if (!studyDays.length) throw new Error("Pick at least one study day.");
  const start = dayStart(startDate);
  const events = [];
  for (const week of roadmap.weeks) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, (week.week - 1) * 7 + i);
      if (studyDays.includes(d.getDay())) dates.push(d);
    }
    const load = dates.map(() => 0);
    for (const task of week.tasks) {
      if (task.completed && !includeCompleted) continue;
      let best = 0;
      for (let i = 1; i < dates.length; i++) if (load[i] < load[best]) best = i;
      const begin = new Date(dates[best].getFullYear(), dates[best].getMonth(), dates[best].getDate(), startHour, load[best]);
      const end = new Date(begin.getTime() + task.estimatedMinutes * 60_000);
      load[best] += task.estimatedMinutes;
      events.push({ taskId: task.id, week: week.week, title: task.title, start: begin, end, description: eventDescription(roadmap, task) });
    }
  }
  return events.sort((a, b) => a.start - b.start);
}

export function eventDescription(roadmap, task) {
  return [
    `Bridge roadmap: ${roadmap.currentRole} -> ${roadmap.targetRole}`,
    `Deliverable: ${task.deliverable}`,
    `Done when: ${task.successCriteria}`,
    ...(task.instructions?.length ? ["Steps:", ...task.instructions.map((s, i) => `${i + 1}. ${s}`)] : []),
  ].join("\n");
}

// 2026-11-15 19:00 local -> "20261115T190000" (floating time).
export function formatLocal(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function formatUtc(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

// Prefilled "create event" link. Nothing is saved until the user clicks Save in Google Calendar.
export function googleCalendarUrl(event) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Bridge: ${event.title}`,
    dates: `${formatLocal(event.start)}/${formatLocal(event.end)}`,
    details: event.description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// RFC 5545 text escaping and 75-octet line folding.
export function icsEscape(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function foldLine(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(events, { calendarId = "roadmap", now = new Date() } = {}) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bridge//Career Roadmap//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Bridge career roadmap"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.taskId}-${calendarId}@bridge.app`,
      `DTSTAMP:${formatUtc(now)}`,
      `DTSTART:${formatLocal(e.start)}`,
      `DTEND:${formatLocal(e.end)}`,
      `SUMMARY:${icsEscape("Bridge: " + e.title)}`,
      `DESCRIPTION:${icsEscape(e.description)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
