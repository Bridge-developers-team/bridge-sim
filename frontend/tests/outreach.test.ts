// The recruiter note must always fit LinkedIn's 200-character limit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionNote, NOTE_LIMIT } from "../src/lib/outreach.ts";

test("names both roles and the city when there is room", () => {
  const note = connectionNote("Middle-school English teacher", "Instructional Designer", "Austin, TX");
  assert.match(note, /^Hi \[Name\], I'm a Middle-school English teacher moving into Instructional Designer work in Austin\./);
  assert.ok(note.length <= NOTE_LIMIT, `${note.length}`);
});

test("uses 'an' before vowels and copes with a missing current role", () => {
  assert.match(connectionNote("ICU nurse", "Analyst", ""), /I'm an ICU nurse moving into Analyst work\./);
  assert.match(connectionNote("", "Analyst", ""), /I'm moving into Analyst work\./);
});

test("never goes over the limit, however long the inputs", () => {
  const long = "Senior regional multi-site operations and logistics coordination specialist".repeat(3);
  for (const city of ["", "Llanfairpwllgwyngyll, Wales", long]) {
    assert.ok(connectionNote(long, long, city).length <= NOTE_LIMIT);
  }
});
