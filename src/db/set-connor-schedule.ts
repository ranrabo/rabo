import { config } from "dotenv";
import { eq, ilike, or } from "drizzle-orm";
import { person, weeklyBlock } from "./schema";

// Rewrites Connor's recurring lab schedule.
//
// Usage:
//   npx tsx src/db/set-connor-schedule.ts [envFile] [--force]
//
//   envFile   defaults to .env.local (pass .env.production.local for prod)
//   --force   actually write; without it the script only prints a plan
//
// Connor is a full-time research assistant, so unlike the students he is in the
// lab every weekday for the whole term with no winter-break gap and no holiday
// exceptions. These bars are the time he IS in the lab: a base window of
// Mon-Fri 08:30-17:00 with his standing commitments carved out --
//   * every day        12:00-12:30  lunch
//   * every Monday      10:00-12:00  class
//   * every Tue + Wed   15:30-17:00  math class
// The board doesn't say why he's out; the gaps just aren't scheduled.
//
// He is flagged admin_only + light grey, so he shows on /admin but not the
// public board.

const args = process.argv.slice(2);
const force = args.includes("--force");
const envFile = args.find((arg) => !arg.startsWith("--")) || ".env.local";
config({ path: envFile });

const GREY = "#D3D3D3";
// One continuous span across the whole term -- no winter-break split.
const EFFECTIVE_FROM = "2026-08-26";
const EFFECTIVE_TO = "2027-05-10";

const WEEKDAY = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 } as const;
type Day = keyof typeof WEEKDAY;
type Slot = [Day, string, string];

// In-lab windows after his lunch / class / math blocks are carved out.
const SLOTS: Slot[] = [
  ["Mon", "08:30", "10:00"],
  ["Mon", "12:30", "17:00"],
  ["Tue", "08:30", "12:00"],
  ["Tue", "12:30", "15:30"],
  ["Wed", "08:30", "12:00"],
  ["Wed", "12:30", "15:30"],
  ["Thu", "08:30", "12:00"],
  ["Thu", "12:30", "17:00"],
  ["Fri", "08:30", "12:00"],
  ["Fri", "12:30", "17:00"],
];

const run = async () => {
  const { db } = await import("./index");
  console.log(`env file:       ${envFile}`);
  console.log(`database host:  ${(process.env.DATABASE_URL || "").replace(/.*@/, "").split(/[/?]/)[0] || "(unset)"}`);

  const [connor] = await db
    .select()
    .from(person)
    .where(or(eq(person.id, 8), ilike(person.fullName, "%connor%")));
  if (!connor) {
    console.error("\nNo person row matches Connor (id 8 / name ilike '%connor%').");
    process.exit(1);
  }

  const rows = SLOTS.map(([day, startTime, endTime]) => ({
    personId: connor.id,
    weekday: WEEKDAY[day],
    startTime,
    endTime,
    effectiveFrom: EFFECTIVE_FROM,
    effectiveTo: EFFECTIVE_TO,
    loggedBy: "set-connor-schedule",
  }));

  const existing = await db.select({ id: weeklyBlock.id }).from(weeklyBlock).where(eq(weeklyBlock.personId, connor.id));

  console.log(`\nresolved: #${connor.id} ${connor.fullName}`);
  console.log(`person:   color ${connor.color} -> ${GREY}, active ${connor.active} -> true, admin_only -> true`);
  console.log(`plan:     delete ${existing.length} existing weekly_block row(s) for Connor, insert ${rows.length}`);
  console.log(`span:     ${EFFECTIVE_FROM} .. ${EFFECTIVE_TO} (single segment, no break)`);
  for (const [day, s, e] of SLOTS) console.log(`  ${day} ${s}-${e}`);

  if (!force) {
    console.log("\nDry run. Re-run with --force to apply.");
    return;
  }

  await db
    .update(person)
    .set({ color: GREY, active: true, adminOnly: true })
    .where(eq(person.id, connor.id));
  await db.delete(weeklyBlock).where(eq(weeklyBlock.personId, connor.id));
  await db.insert(weeklyBlock).values(rows);

  console.log(`\nDone. Connor is grey + admin-only with ${rows.length} weekly_block rows.`);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
