import { test } from "node:test";
import assert from "node:assert/strict";
import { scheduleTasks, startDateFor, buildIcs, googleCalendarUrl, icsEscape, foldLine, formatLocal } from "../lib/calendar.js";
import { buildRoadmap, setTaskCompleted } from "../lib/roadmap.js";
import { demoRoadmap } from "../server/demo.js";

const career = { id: "id", title: "Instructional Designer", missingSkills: ["Storyboarding"], transferableSkills: [] };
const roadmap = buildRoadmap(demoRoadmap({ career, track: "balanced", hoursPerWeek: 5 }), {
  id: "r1",
  candidateId: "c",
  career,
  currentRole: "Teacher",
  track: "balanced",
  hoursPerWeek: 5,
  createdAt: "x",
});
// Sunday 15 Nov 2026, local time.
const sunday = new Date(2026, 10, 15);

test("startDateFor: today, tomorrow, next Monday", () => {
  assert.equal(startDateFor("today", sunday).getDate(), 15);
  assert.equal(startDateFor("tomorrow", sunday).getDate(), 16);
  assert.equal(startDateFor("monday", sunday).getDate(), 16);
  assert.equal(startDateFor("monday", new Date(2026, 10, 16, 9)).getDate(), 23); // a Monday -> the next one
});

test("every unfinished task gets one event, on a chosen day, inside its own week", () => {
  const events = scheduleTasks(roadmap, { startDate: sunday, days: [2, 4, 6], startHour: 19 });
  const total = roadmap.weeks.reduce((s, w) => s + w.tasks.length, 0);
  assert.equal(events.length, total);
  for (const e of events) {
    assert.ok([2, 4, 6].includes(e.start.getDay()));
    const dayIndex = Math.round((e.start - sunday) / 86_400_000 - e.start.getHours() / 24);
    assert.ok(dayIndex >= (e.week - 1) * 7 && dayIndex < e.week * 7, `${e.title} in week ${e.week}`);
    const task = roadmap.weeks[e.week - 1].tasks.find((t) => t.id === e.taskId);
    assert.equal((e.end - e.start) / 60_000, task.estimatedMinutes);
  }
});

test("tasks on the same day follow each other without overlap", () => {
  const events = scheduleTasks(roadmap, { startDate: sunday, days: [1], startHour: 18 });
  for (let i = 1; i < events.length; i++) {
    if (events[i].start.toDateString() === events[i - 1].start.toDateString()) assert.ok(events[i].start >= events[i - 1].end);
  }
  assert.equal(events[0].start.getHours(), 18);
});

test("completed tasks are skipped; no study day is an error", () => {
  const first = roadmap.weeks[0].tasks[0].id;
  const done = setTaskCompleted(roadmap, first, true);
  assert.ok(!scheduleTasks(done, { startDate: sunday, days: [1, 3] }).some((e) => e.taskId === first));
  assert.throws(() => scheduleTasks(roadmap, { startDate: sunday, days: [] }), /study day/);
});

test("ics: valid structure, escaping, folding and floating local times", () => {
  const events = scheduleTasks(roadmap, { startDate: sunday, days: [2, 4], startHour: 19 });
  const ics = buildIcs(events, { calendarId: "r1", now: new Date(Date.UTC(2026, 10, 14, 12)) });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, events.length);
  assert.ok(ics.includes(`DTSTART:${formatLocal(events[0].start)}\r\n`));
  assert.ok(!/DTSTART:\d+T\d+Z/.test(ics), "start times must be floating, not UTC");
  for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.equal(icsEscape("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
  assert.equal(foldLine("x".repeat(80)), "x".repeat(75) + "\r\n " + "x".repeat(5));
});

test("google link is a prefilled create-event URL", () => {
  const [e] = scheduleTasks(roadmap, { startDate: sunday, days: [2], startHour: 19 });
  const url = new URL(googleCalendarUrl(e));
  assert.equal(url.host, "calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("dates"), `${formatLocal(e.start)}/${formatLocal(e.end)}`);
  assert.ok(url.searchParams.get("text").startsWith("Bridge: "));
});
