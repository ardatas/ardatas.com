import test from "node:test";
import assert from "node:assert/strict";
import {
  dayStart,
  elapsed,
  newSession,
  running,
  shiftDay,
  starterTags,
  transition,
} from "./model";

test("pausing, reloading, resuming, and stopping preserve worked time", () => {
  const started = newSession(starterTags[0], 1000);
  const paused = transition(started, "pause", 6000);
  assert.equal(elapsed(paused, 360000), 5000);
  assert.equal(running(paused), false);
  const resumed = transition(
    JSON.parse(JSON.stringify(paused)),
    "resume",
    360000,
  );
  const stopped = transition(resumed, "stop", 362000);
  assert.equal(elapsed(stopped, 900000), 7000);
  assert.equal(stopped.revision, 3);
  assert.throws(() => transition(stopped, "resume", 400000));
  assert.equal(transition(paused, "stop", 50000).intervals.at(-1)?.end, 6000);
});
test("midnight splits active work into the correct day", () => {
  const midnight = new Date(2026, 10, 22).getTime();
  const s = newSession(starterTags[1], midnight - 30000);
  assert.equal(
    elapsed(s, midnight + 20000, dayStart(s.started_at), midnight),
    30000,
  );
  assert.equal(
    elapsed(s, midnight + 20000, midnight, shiftDay(midnight, 1)),
    20000,
  );
});
test("local calendar days span both DST transitions", () => {
  process.env.TZ = "Europe/Berlin";
  for (const [month, date, hours] of [
    [2, 29, 23],
    [9, 25, 25],
  ]) {
    const day = new Date(2026, month, date).getTime();
    assert.equal(shiftDay(day, 1) - day, hours * 3600000);
  }
});
