import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { changeOccurrenceQuery, occurrenceDate } from "./schedule-occurrence";

const dialect = new PgDialect();
const change = { personId: 1, weekday: 3, startTime: "13:00", endTime: "15:00" };

test("single-date schedule changes preserve other weeks and attendance", async (t) => {
  const pg = new PGlite();
  try {
    const migrations = new URL("../../drizzle/", import.meta.url);
    for (const file of (await readdir(migrations)).filter((name) => name.endsWith(".sql")).sort()) {
      await pg.exec(await readFile(new URL(file, migrations), "utf8"));
    }
    await pg.exec("INSERT INTO person (full_name,research_area) VALUES ('Test One','Test'),('Test Two','Test')");
    const reset = async (from = "2026-09-02", to: string | null = "2026-10-28") => {
      await pg.exec("TRUNCATE weekly_block, block_attendance RESTART IDENTITY CASCADE");
      await pg.query("INSERT INTO weekly_block (person_id,weekday,start_time,end_time,effective_from,effective_to) VALUES (1,3,'09:00','12:00',$1,$2)", [from, to]);
    };
    const save = async (date = "2026-09-23", fields: typeof change | null = change, version = 1) => {
      const query = dialect.sqlToQuery(changeOccurrenceQuery(1, version, date, "test", fields));
      return pg.query(query.sql, query.params);
    };
    const onDate = async (date: string) => (await pg.query(`SELECT person_id,start_time::text,end_time::text FROM weekly_block
      WHERE weekday=extract(isodow FROM $1::date) AND effective_from <= $1::date
      AND (effective_to IS NULL OR effective_to >= $1::date)`, [date])).rows;
    const snapshot = async () => (await pg.query("SELECT * FROM weekly_block ORDER BY id")).rows;
    const oldHours = [{ person_id: 1, start_time: "09:00:00", end_time: "12:00:00" }];
    const newHours = [{ person_id: 1, start_time: "13:00:00", end_time: "15:00:00" }];

    await t.test("resize changes only that Wednesday and retains all confirmations", async () => {
      await reset();
      await pg.exec("INSERT INTO block_attendance (weekly_block_id,attend_date) VALUES (1,'2026-09-16'),(1,'2026-09-23'),(1,'2026-09-30')");
      assert.equal((await save()).rows.length, 1);
      assert.deepEqual(await onDate("2026-09-16"), oldHours);
      assert.deepEqual(await onDate("2026-09-23"), newHours);
      assert.deepEqual(await onDate("2026-09-30"), oldHours);
      const confirmations = await pg.query(`SELECT a.attend_date::text,w.start_time::text FROM block_attendance a
        JOIN weekly_block w ON w.id=a.weekly_block_id ORDER BY a.attend_date`);
      assert.deepEqual(confirmations.rows, [
        { attend_date: "2026-09-16", start_time: "09:00:00" },
        { attend_date: "2026-09-23", start_time: "13:00:00" },
        { attend_date: "2026-09-30", start_time: "09:00:00" },
      ]);
      // Editing the resulting one-off again doesn't recreate or change siblings.
      await save("2026-09-23", { ...change, endTime: "16:00" }, 2);
      assert.equal((await snapshot()).length, 3);
      assert.deepEqual(await onDate("2026-09-30"), oldHours);
    });

    await t.test("move/reassign affects only one occurrence and clears its old confirmation", async () => {
      await reset();
      await pg.exec("INSERT INTO block_attendance (weekly_block_id,attend_date) VALUES (1,'2026-09-16'),(1,'2026-09-23'),(1,'2026-09-30')");
      await save("2026-09-23", { ...change, weekday: 5, personId: 2 });
      assert.deepEqual(await onDate("2026-09-23"), []);
      assert.deepEqual(await onDate("2026-09-25"), [{ ...newHours[0], person_id: 2 }]);
      assert.deepEqual(await onDate("2026-09-16"), oldHours);
      assert.deepEqual(await onDate("2026-09-30"), oldHours);
      assert.equal((await pg.query("SELECT * FROM block_attendance")).rows.length, 2);
    });

    await t.test("removal keeps past/future blocks and their confirmations", async () => {
      await reset();
      await pg.exec("INSERT INTO block_attendance (weekly_block_id,attend_date) VALUES (1,'2026-09-16'),(1,'2026-09-23'),(1,'2026-09-30')");
      assert.equal((await save("2026-09-23", null)).rows.length, 1);
      assert.deepEqual(await onDate("2026-09-23"), []);
      assert.deepEqual(await onDate("2026-09-16"), oldHours);
      assert.deepEqual(await onDate("2026-09-30"), oldHours);
      assert.equal((await pg.query("SELECT * FROM block_attendance")).rows.length, 2);
    });

    await t.test("stale versions, wrong weekdays, and out-of-range dates change nothing", async () => {
      await reset();
      const before = await snapshot();
      for (const [date, version] of [["2026-09-23", 2], ["2026-09-24", 1], ["2026-11-04", 1]] as const) {
        assert.equal((await save(date, change, version)).rows.length, 0);
        assert.deepEqual(await snapshot(), before);
      }
      await assert.rejects(save("2026-09-23", { ...change, personId: 999 }));
      assert.deepEqual(await snapshot(), before, "failed writes roll back the entire split");
    });

    await t.test("first/last dates, one-offs, and open-ended ranges", async () => {
      for (const [from, to] of [["2026-09-23", "2026-10-28"], ["2026-09-02", "2026-09-23"], ["2026-09-23", "2026-09-23"], ["2026-09-02", null]]) {
        await reset(from!, to);
        await save();
        assert.deepEqual(await onDate("2026-09-23"), newHours);
        assert.deepEqual(await onDate("2026-09-16"), from! < "2026-09-23" ? oldHours : []);
        assert.deepEqual(await onDate("2026-09-30"), to === null || to! > "2026-09-23" ? oldHours : []);
        if (to === null) assert.deepEqual(await onDate("2027-09-29"), oldHours);
      }
      await reset("2026-09-23", "2026-09-23");
      await save("2026-09-23", null);
      assert.deepEqual(await snapshot(), []);
    });
  } finally {
    await pg.close();
  }
});

test("occurrence dates must be real calendar dates", () => {
  for (const date of ["", "2026-02-30", "2026-13-01", "not-a-date"]) {
    assert.throws(() => occurrenceDate(date));
  }
  assert.equal(occurrenceDate("2026-09-23"), "2026-09-23");
});
