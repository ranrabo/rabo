import { config } from "dotenv";
import { eq, ilike } from "drizzle-orm";
import { person } from "./schema";

// Usage:
//   npx tsx src/db/set-person-active.ts "<name substring or id>" <true|false> [envFile]
// Examples:
//   npx tsx src/db/set-person-active.ts "Connor" false          # hide from the public board
//   npx tsx src/db/set-person-active.ts 8 true                  # show again (by id)
const needle = process.argv[2];
const activeArg = process.argv[3];
const envFile = process.argv[4] || ".env.local";

config({ path: envFile });

if (!needle || (activeArg !== "true" && activeArg !== "false")) {
  console.error('Usage: npx tsx src/db/set-person-active.ts "<name substring or id>" <true|false> [envFile]');
  process.exit(1);
}

const run = async () => {
  const { db } = await import("./index");
  const active = activeArg === "true";
  const where = /^\d+$/.test(needle) ? eq(person.id, Number(needle)) : ilike(person.fullName, `%${needle}%`);
  const updated = await db.update(person).set({ active }).where(where).returning({ id: person.id, fullName: person.fullName, active: person.active });
  if (!updated.length) {
    console.error(`No person matched "${needle}"`);
    process.exit(1);
  }
  console.log(`env file: ${envFile}`);
  updated.forEach((p) => console.log(`  #${p.id} ${p.fullName} -> active=${p.active}`));
};

run().catch((error: unknown) => { console.error(error); process.exit(1); });
