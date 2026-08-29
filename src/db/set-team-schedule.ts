import { config } from "dotenv";
import { asc, inArray, not } from "drizzle-orm";
import { person, weeklyBlock } from "./schema";

// Replaces every weekly_block row with the current team's recurring schedule.
//
// Usage:
//   npx tsx src/db/set-team-schedule.ts [envFile] [--create-missing] [--deactivate-others] [--force]
//
//   envFile              defaults to .env.local (pass .env.production.local for prod)
//   --create-missing     insert a person row for any name below that has no match
//   --deactivate-others  set active=false on every person NOT in the team list
//   --force              actually write; without it the script only prints a plan
//
// Term runs 2026-08-26 .. 2027-05-20 with a winter break: nobody is scheduled
// from 2026-12-14 through 2027-01-24. That break is expressed by giving every
// slot two effective segments instead of one continuous range.

const args = process.argv.slice(2);
const force = args.includes("--force");
const createMissing = args.includes("--create-missing");
const deactivateOthers = args.includes("--deactivate-others");
const envFile = args.find((arg) => !arg.startsWith("--")) || ".env.local";
config({ path: envFile });

const SEGMENTS = [
  { effectiveFrom: "2026-08-26", effectiveTo: "2026-12-13" },
  { effectiveFrom: "2027-01-25", effectiveTo: "2027-05-20" },
];

const WEEKDAY = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 } as const;
type Day = keyof typeof WEEKDAY;
type Slot = [Day, string, string];

// First name as typed by the lab -> recurring slots (start/end, 24h, 15-min grid).
const SCHEDULE: Record<string, Slot[]> = {
  Alexis: [["Tue", "08:00", "13:00"], ["Thu", "08:00", "13:00"]],
  Asher: [["Mon", "13:00", "16:00"], ["Wed", "13:00", "16:00"], ["Fri", "13:00", "16:00"]],
  Crosby: [["Mon", "12:00", "15:00"], ["Tue", "10:00", "13:00"], ["Wed", "13:00", "15:00"]],
  Emmett: [["Mon", "15:00", "17:00"], ["Tue", "14:00", "16:00"], ["Thu", "14:00", "16:00"]],
  Erica: [["Tue", "08:00", "11:00"], ["Thu", "08:00", "11:00"]],
  Finnur: [["Tue", "10:00", "14:00"], ["Wed", "13:30", "15:30"], ["Thu", "10:00", "14:00"]],
  Hayden: [["Mon", "15:00", "17:00"], ["Tue", "11:00", "17:00"], ["Thu", "11:00", "13:00"], ["Fri", "12:00", "17:00"]],
  Richie: [["Mon", "15:30", "17:00"], ["Tue", "09:30", "12:00"], ["Wed", "15:30", "17:00"], ["Thu", "09:30", "12:00"], ["Thu", "14:00", "17:00"], ["Fri", "13:00", "17:00"]],
  Tiba: [["Mon", "14:00", "16:00"], ["Tue", "08:00", "09:00"], ["Wed", "14:00", "17:00"]],
  Tyler: [["Mon", "08:00", "09:30"], ["Mon", "11:00", "13:00"], ["Tue", "08:00", "09:00"], ["Wed", "08:00", "09:00"], ["Wed", "11:00", "12:30"], ["Thu", "08:00", "09:30"], ["Fri", "11:00", "13:00"]],
};

const NEW_PERSON_COLORS = ["#EE7E61", "#459379", "#5F70B3", "#D590B6", "#B5A131", "#2095A6", "#A26A5F", "#668144", "#91517D", "#4F6E8F"];

const firstToken = (value: string) => value.trim().toLowerCase().split(/\s+/)[0];

const run = async () => {
  const { db } = await import("./index");
  console.log(`env file:       ${envFile}`);
  console.log(`database host:  ${(process.env.DATABASE_URL || "").replace(/.*@/, "").split(/[/?]/)[0] || "(unset)"}`);

  const names = Object.keys(SCHEDULE);
  let people = await db.select().from(person).orderBy(asc(person.sortOrder), asc(person.fullName));
  const matchFor = (name: string) => people.find((row) => firstToken(row.fullName) === name.toLowerCase());

  const missing = names.filter((name) => !matchFor(name));
  if (missing.length && !createMissing) {
    console.error(`\nNo person row matches: ${missing.join(", ")}`);
    console.error("Re-run with --create-missing to add them, or create them first with the right research area.");
    process.exit(1);
  }
  if (missing.length && createMissing) {
    const base = people.length;
    await db.insert(person).values(missing.map((name, index) => ({
      fullName: name,
      researchArea: "TBD",
      color: NEW_PERSON_COLORS[(base + index) % NEW_PERSON_COLORS.length],
      sortOrder: base + index + 1,
    })));
    people = await db.select().from(person).orderBy(asc(person.sortOrder), asc(person.fullName));
    console.log(`created ${missing.length} person row(s): ${missing.join(", ")} (research area "TBD")`);
  }

  const rows = names.flatMap((name) => {
    const member = matchFor(name)!;
    return SCHEDULE[name].flatMap(([day, startTime, endTime]) =>
      SEGMENTS.map((segment) => ({
        personId: member.id,
        weekday: WEEKDAY[day],
        startTime,
        endTime,
        effectiveFrom: segment.effectiveFrom,
        effectiveTo: segment.effectiveTo,
        loggedBy: "set-team-schedule",
      })));
  });

  const teamIds = names.map((name) => matchFor(name)!.id);
  const others = people.filter((row) => !teamIds.includes(row.id) && row.active);

  const existing = await db.select({ id: weeklyBlock.id }).from(weeklyBlock);
  console.log(`\nresolved people:`);
  for (const name of names) console.log(`  ${name.padEnd(8)} -> #${matchFor(name)!.id} ${matchFor(name)!.fullName}`);
  console.log(`\nplan: delete ${existing.length} existing weekly_block row(s), insert ${rows.length} (${rows.length / SEGMENTS.length} slots x ${SEGMENTS.length} term segments)`);
  console.log(`segments: ${SEGMENTS.map((s) => `${s.effectiveFrom}..${s.effectiveTo}`).join("  +  ")}`);
  if (deactivateOthers) console.log(`deactivate ${others.length} non-team person row(s): ${others.map((row) => row.fullName).join(", ") || "(none)"}`);
  else if (others.length) console.log(`note: ${others.length} other active person row(s) left untouched (pass --deactivate-others to hide them): ${others.map((row) => row.fullName).join(", ")}`);

  if (!force) {
    console.log("\nDry run. Re-run with --force to apply.");
    return;
  }

  await db.delete(weeklyBlock);
  await db.insert(weeklyBlock).values(rows);
  if (deactivateOthers && others.length) {
    await db.update(person).set({ active: false }).where(not(inArray(person.id, teamIds)));
  }
  console.log(`\nDone. weekly_block now has ${rows.length} rows.`);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
