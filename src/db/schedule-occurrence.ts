import { sql } from "drizzle-orm";
import { addDays, getMonday } from "../lib/utils";

export function occurrenceDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw new Error("Choose a valid date for this block.");
  }
  return value;
}

type Change = { personId: number; weekday: number; startTime: string; endTime: string };

// Keep the edited occurrence's ID, splitting its original recurring range around
// that date. Attendance on other dates follows the unchanged before/after rows.
// One SQL statement makes the split and attendance migration atomic, including
// the optimistic version check. No schema change or per-date overrides needed.
export function changeOccurrenceQuery(id: number, version: number, date: string, actor: string, change: Change | null) {
  occurrenceDate(date);
  const targetDate = change ? addDays(getMonday(date), change.weekday - 1) : date;
  const finish = change ? sql`
    UPDATE weekly_block w SET
      person_id = ${change.personId}, weekday = ${change.weekday},
      start_time = ${change.startTime}::time, end_time = ${change.endTime}::time,
      effective_from = ${targetDate}::date, effective_to = ${targetDate}::date,
      version = w.version + 1, logged_by = ${actor}, updated_at = now()
    FROM original o
    WHERE w.id = o.id AND (SELECT count(*) FROM moved_attendance) >= 0
      AND (SELECT count(*) FROM cleared_attendance) >= 0
    RETURNING w.id
  ` : sql`
    DELETE FROM weekly_block w USING original o
    WHERE w.id = o.id AND (SELECT count(*) FROM moved_attendance) >= 0
    RETURNING w.id
  `;
  return sql`
    WITH original AS MATERIALIZED (
      SELECT * FROM weekly_block
      WHERE id = ${id} AND version = ${version}
        AND weekday = extract(isodow FROM ${date}::date)
        AND effective_from <= ${date}::date
        AND (effective_to IS NULL OR effective_to >= ${date}::date)
      FOR UPDATE
    ), ranges AS (
      SELECT o.*, o.effective_from AS range_from, ${date}::date - 1 AS range_to
      FROM original o WHERE o.effective_from < ${date}::date
      UNION ALL
      SELECT o.*, ${date}::date + 1 AS range_from, o.effective_to AS range_to
      FROM original o WHERE o.effective_to IS NULL OR o.effective_to > ${date}::date
    ), preserved AS (
      INSERT INTO weekly_block (person_id, weekday, start_time, end_time,
        effective_from, effective_to, version, logged_by, created_at, updated_at)
      SELECT person_id, weekday, start_time, end_time, range_from, range_to,
        version, logged_by, created_at, updated_at FROM ranges
      RETURNING id, effective_from, effective_to
    ), moved_attendance AS (
      UPDATE block_attendance a SET weekly_block_id = p.id
      FROM preserved p, original o
      WHERE a.weekly_block_id = o.id
        AND a.attend_date >= p.effective_from
        AND (p.effective_to IS NULL OR a.attend_date <= p.effective_to)
      RETURNING a.id
    ), cleared_attendance AS (
      DELETE FROM block_attendance a USING original o
      WHERE a.weekly_block_id = o.id AND a.attend_date = ${date}::date
        AND ${change !== null} AND (o.person_id <> ${change?.personId ?? 0} OR ${targetDate}::date <> ${date}::date)
      RETURNING a.id
    ) ${finish}
  `;
}
