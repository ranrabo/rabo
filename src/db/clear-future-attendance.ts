import { config } from "dotenv";
import { and, eq, gt } from "drizzle-orm";
import { blockAttendance, person, weeklyBlock } from "./schema";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// Removes block_attendance rows dated AFTER a cutoff (default: today, lab time).
// The old confirm-attendance flow wrote rows against the current week's date
// regardless of which week the board was showing, so any confirmation for a
// future day is suspect. Dry-run by default; pass --apply to delete.
//
// Usage:
//   npx tsx src/db/clear-future-attendance.ts                     # list rows after today
//   npx tsx src/db/clear-future-attendance.ts --apply             # delete them
//   npx tsx src/db/clear-future-attendance.ts 2026-09-03 --apply  # explicit cutoff
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const envFile = args.find((a) => a.endsWith(".env.local") || a.endsWith(".env")) || ".env.local";
const cutoffArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));

config({ path: envFile });

const labToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const run = async () => {
  const { db } = await import("./index");
  const cutoff = cutoffArg || labToday();

  const rows = await db
    .select({
      id: blockAttendance.id,
      attendDate: blockAttendance.attendDate,
      loggedBy: blockAttendance.loggedBy,
      createdAt: blockAttendance.createdAt,
      name: person.fullName,
      weekday: weeklyBlock.weekday,
      start: weeklyBlock.startTime,
      end: weeklyBlock.endTime,
    })
    .from(blockAttendance)
    .innerJoin(weeklyBlock, eq(blockAttendance.weeklyBlockId, weeklyBlock.id))
    .innerJoin(person, eq(weeklyBlock.personId, person.id))
    .where(gt(blockAttendance.attendDate, cutoff))
    .orderBy(blockAttendance.attendDate);

  console.log(`env file: ${envFile}`);
  console.log(`cutoff:   ${cutoff} (rows with attend_date AFTER this)`);
  console.log(`matched:  ${rows.length} row(s)\n`);
  for (const r of rows) {
    console.log(
      `  #${r.id}  ${r.attendDate}  ${WEEKDAYS[r.weekday - 1]} ${r.start.slice(0, 5)}–${r.end.slice(0, 5)}  ${r.name}` +
        `  · logged by ${r.loggedBy ?? "?"} on ${new Date(r.createdAt).toISOString().slice(0, 10)}`,
    );
  }

  if (!rows.length) {
    console.log("\nNothing to do.");
    return;
  }
  if (!apply) {
    console.log("\nDry run. Re-run with --apply to delete these rows.");
    return;
  }

  const deleted = await db
    .delete(blockAttendance)
    .where(and(gt(blockAttendance.attendDate, cutoff)))
    .returning({ id: blockAttendance.id });
  console.log(`\nDeleted ${deleted.length} row(s).`);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
