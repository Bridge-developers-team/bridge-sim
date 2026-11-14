import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeState, decodeState } from "../lib/shareState.js";

test("share state round-trips, including unicode", async () => {
  const state = { v: 1, roleId: "project-manager", tasks: [{ answer: "Café — “quotes” ✓\nline 2" }], plan: { salary: 50000, hours: 8 } };
  const token = await encodeState(state);
  assert.match(token, /^v1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeState(token), state);
});

test("large answers stay URL-sized", async () => {
  const answer = "We should test the checklist with two shifts first. ".repeat(60);
  const token = await encodeState({ tasks: [{ answer }, { answer }, { answer }] });
  assert.ok(token.length < 4000, `token length ${token.length}`);
});

test("decodeState rejects foreign or broken links", async () => {
  await assert.rejects(() => decodeState("hello"), /Bridge Sim/);
  await assert.rejects(() => decodeState("v1.@@@"));
});
