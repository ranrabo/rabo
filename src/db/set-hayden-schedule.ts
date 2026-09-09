import { config } from "dotenv";
import { asc, eq, ilike } from "drizzle-orm";
import { person, weeklyBlock } from "./schema";

// Switches Hayden's recurring lab schedule to Mon 15:00-17:00, Tue 11:00-17:00,
// Thu 11:00-13:00 and Fri 12:00-15:00 starting 2026-09-09. Past weeks are left
// untouched: any block that is currently running is capped the day before the
// cutover, and blocks that only start in the future are replaced. New blocks
// reuse Hayden's own effective-date ranges (so the winter-break split survives),
// just clamped so nothing starts before the cutover.
//
// Usage:
//   npx tsx src/db/set-hayden-schedule.ts [envFile] [--force]
//
//   envFile   defaults to .env.local (pass .env.production.local for prod)
//   --force   actually write; without it the script only prints a plan

const args = process.argv.slice(2);
const force = args.includes("--force");
const envFile = args.find((arg) => !arg.startsWith("--")) || ".env.local";
config({ path: envFile });

// New schedule takes effect on this date; everything before it is history.
const CUTOVER = "2026-09-09";
const LAST_OLD_DAY = "2026-09-08";

const WEEKDAY = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 } as const;
const NEW_SLOTS: [keyof typeof WEEKDAY, string, string][] = [
  ["Mon", "15:00", "17:00"],
  ["Tue", "11:00", "17:00"],
  ["Thu", "11:00", "13:00"],
  ["Fri", "12:00", "15:00"],
];

const firstToken = (value: string) => value.trim().toLowerCase().split(/\s+/)[0];
const fmt = (row: { weekday: number; startTime: string; endTime: string; effectiveFrom: string; effectiveTo: string | null }) => {
  const day = Object.keys(WEEKDAY).find((key) => WEEKDAY[key as keyof typeof WEEKDAY] === row.weekday) ?? `wd${row.weekday}`;
  return `${day} ${row.startTime.slice(0, 5)}-${row.endTime.slice(0, 5)}  [${row.effectiveFrom} .. ${row.effectiveTo ?? "open"}]`;
};

const run = async () => {
  const { db } = await import("./index");
  console.log(`env file:       ${envFile}`);
  console.log(`database host:  ${(process.env.DATABASE_URL || "").replace(/.*@/, "").split(/[/?]/)[0] || "(unset)"}`);

  const candidates = await db
    .select()
    .from(person)
    .where(ilike(person.fullName, "%hayden%"))
    .orderBy(asc(person.id));
  if (candidates.length === 0) {
    console.error("\nNo person row matches name ilike '%hayden%'.");
    process.exit(1);
  }
  const hayden = candidates.find((row) => firstToken(row.fullName) === "hayden") ?? candidates[0];
  if (candidates.length > 1) {
    console.log(`\nheads up: ${candidates.length} name matches (${candidates.map((c) => `#${c.id} ${c.fullName}`).join(", ")}); using #${hayden.id}`);
  }
  console.log(`\nresolved: #${hayden.id} ${hayden.fullName}`);

  const existing = await db
    .select()
    .from(weeklyBlock)
    .where(eq(weeklyBlock.personId, hayden.id))
    .orderBy(asc(weeklyBlock.effectiveFrom), asc(weeklyBlock.weekday), asc(weeklyBlock.startTime));

  // A block covering exactly one calendar day is an ad-hoc addition an admin made
  // for that day, not part of the recurring schedule. Leave those alone.
  const isOneOff = (row: { effectiveFrom: string; effectiveTo: string | null }) =>
    row.effectiveTo !== null && row.effectiveTo === row.effectiveFrom;

  const oneOffs = existing.filter(isOneOff);
  const recurring = existing.filter((row) => !isOneOff(row));

  const untouched = recurring.filter((row) => row.effectiveTo !== null && row.effectiveTo < CUTOVER);
  const toCap = recurring.filter(
    (row) => row.effectiveFrom < CUTOVER && (row.effectiveTo === null || row.effectiveTo >= CUTOVER),
  );
  const toDelete = recurring.filter((row) => row.effectiveFrom >= CUTOVER);

  // Distinct effective-date ranges that still reach into the future, clamped to
  // start no earlier than the cutover. Preserves the term/winter-break split.
  const seen = new Set<string>();
  const segments = [...toCap, ...toDelete]
    .map((row) => ({
      from: row.effectiveFrom < CUTOVER ? CUTOVER : row.effectiveFrom,
      to: row.effectiveTo,
    }))
    .filter((segment) => {
      const key = `${segment.from}|${segment.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const newRows = NEW_SLOTS.flatMap(([day, startTime, endTime]) =>
    segments.map((segment) => ({
      personId: hayden.id,
      weekday: WEEKDAY[day],
      startTime,
      endTime,
      effectiveFrom: segment.from,
      effectiveTo: segment.to,
      loggedBy: "set-hayden-schedule",
    })),
  ).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.weekday - b.weekday);

  console.log(`\nexisting weekly_block rows (${existing.length}):`);
  for (const row of existing) console.log(`  ${fmt(row)}`);

  console.log(`\nplan (cutover ${CUTOVER}):`);
  console.log(`  keep as-is (already ended before cutover): ${untouched.length}`);
  console.log(`  keep as-is (single-day one-off blocks): ${oneOffs.length}`);
  for (const row of oneOffs) console.log(`    ${fmt(row)}`);
  console.log(`  cap effective_to -> ${LAST_OLD_DAY}: ${toCap.length}`);
  for (const row of toCap) console.log(`    ${fmt(row)}`);
  console.log(`  delete (starts on/after cutover): ${toDelete.length}`);
  for (const row of toDelete) console.log(`    ${fmt(row)}`);
  console.log(`  insert ${newRows.length} new row(s):`);
  for (const row of newRows) console.log(`    ${fmt(row)}`);

  if (!force) {
    console.log("\nDry run. Re-run with --force to apply.");
    return;
  }

  for (const row of toCap) {
    await db
      .update(weeklyBlock)
      .set({ effectiveTo: LAST_OLD_DAY, updatedAt: new Date() })
      .where(eq(weeklyBlock.id, row.id));
  }
  for (const row of toDelete) {
    await db.delete(weeklyBlock).where(eq(weeklyBlock.id, row.id));
  }
  await db.insert(weeklyBlock).values(newRows);

  console.log(`\nDone. Hayden now runs Mon 15:00-17:00, Tue 11:00-17:00, Thu 11:00-13:00, Fri 12:00-15:00 from ${CUTOVER}.`);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
