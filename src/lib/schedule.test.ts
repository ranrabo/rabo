import assert from "node:assert/strict";
import { test } from "node:test";
import { occursInWeek } from "./schedule";

test("a midweek schedule change shows only the version valid on each day", () => {
  const old = { effectiveFrom: "2026-08-26", effectiveTo: "2026-09-22" };
  const next = { effectiveFrom: "2026-09-23", effectiveTo: "2026-12-13" };
  const blocks = [
    { ...old, weekday: 1 }, { ...old, weekday: 3 }, { ...old, weekday: 5 },
    { ...next, weekday: 3 }, { ...next, weekday: 5 },
  ];
  assert.deepEqual(blocks.filter((b) => occursInWeek(b, "2026-09-21")), [blocks[0], blocks[3], blocks[4]]);
  assert.deepEqual(blocks.filter((b) => occursInWeek(b, "2026-09-14")), blocks.slice(0, 3));
  assert.deepEqual(blocks.filter((b) => occursInWeek(b, "2026-09-28")), blocks.slice(3));
});

test("one-off, inclusive end dates, and open-ended schedules", () => {
  const oneOff = { weekday: 3, effectiveFrom: "2026-09-23", effectiveTo: "2026-09-23" };
  assert.equal(occursInWeek(oneOff, "2026-09-21"), true);
  assert.equal(occursInWeek(oneOff, "2026-09-28"), false);
  assert.equal(occursInWeek({ weekday: 5, effectiveFrom: "2026-09-01", effectiveTo: "2026-09-25" }, "2026-09-21"), true);
  assert.equal(occursInWeek({ ...oneOff, effectiveTo: null }, "2027-01-25"), true);
});
