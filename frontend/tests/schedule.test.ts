// The if-then study plan: sessions, the calendar file and the sentences.
import { test } from "node:test";
import assert from "node:assert/strict";
import { daysText, ifThen, nextMonday, sessionMinutes, sessions, slotsOf, toIcs } from "../src/lib/schedule.ts";
import { roadmap, task } from "./fixtures.ts";

test("the fresh start is the coming Monday, or today on a Monday", () => {
  assert.equal(nextMonday(new Date(2026, 10, 15)), "2026-11-16"); // a Sunday
  assert.equal(nextMonday(new Date(2026, 10, 16)), "2026-11-16"); // a Monday
});

test("sessions fill 28 days on the chosen weekdays and name the week's next task", () => {
  const plan = roadmap([[task("a", true), task("b")], [task("c")], [task("d")], [task("e")]]);
  const list = sessions(plan, { slots: [{ day: 4, time: "18:00" }, { day: 2, time: "19:00" }], start: "2026-11-16" });

  assert.equal(list.length, 8);
  assert.equal(list[0]?.date, "2026-11-17");
  assert.equal(list[0]?.title, "b"); // "a" is already done
  assert.equal(list[0]?.time, "19:00");
  assert.equal(list[1]?.time, "18:00"); // each day keeps its own time
  assert.equal(list.at(-1)?.week, 4);
  assert.equal(list[0]?.minutes, 150); // 5 h over 2 days
  assert.equal(sessionMinutes(2, 7), 15);
});

test("the calendar file has one event per session in local time, with CRLF lines", () => {
  const plan = roadmap([[task("Write, then; check")]]);
  const list = sessions(plan, { slots: [{ day: 1, time: "07:00" }], start: "2026-11-16" });
  const ics = toIcs(plan, list, "https://example.com/plan", new Date("2026-11-15T00:00:00Z"));

  assert.equal(ics.match(/BEGIN:VEVENT/g)?.length, 4);
  assert.ok(ics.includes("DTSTART:20261116T070000\r\n"));
  assert.ok(ics.includes("Write\\, then\\; check"));
  assert.ok(ics.split("\r\n").every((line) => line.length <= 75));
});

test("the if-then sentence lists days from Monday", () => {
  assert.equal(daysText([4, 2]), "Tuesday and Thursday");
  assert.equal(daysText([0, 1, 3]), "Monday, Wednesday and Sunday");
  assert.equal(
    ifThen({ slots: [{ day: 2, time: "19:30" }], start: "2026-11-16" }),
    "When it's Tuesday at 7:30 pm, I open my Bridge plan and do the next task.",
  );
  assert.equal(
    ifThen({ slots: [{ day: 6, time: "10:00" }, { day: 1, time: "07:00" }], start: "2026-11-16" }),
    "When it's Monday at 7:00 am and Saturday at 10:00 am, I open my Bridge plan and do the next task.",
  );
  // A schedule saved before per-day times still reads.
  assert.deepEqual(slotsOf({ days: [4, 2], time: "19:00" }), [
    { day: 2, time: "19:00" },
    { day: 4, time: "19:00" },
  ]);
});
