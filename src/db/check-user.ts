import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { appUser } from "./schema";

config({ path: process.argv[2] || ".env.local" });

const run = async () => {
  const { db } = await import("./index");
  const rows = await db.select().from(appUser);
  console.log("DATABASE_URL host:", (process.env.DATABASE_URL || "").replace(/.*@/, "").split("/")[0]);
  console.log("rows:", rows.map((r) => ({ id: r.id, email: r.email, hashPrefix: r.passwordHash.slice(0, 7), hashLen: r.passwordHash.length })));
  for (const r of rows) {
    console.log(`  ${r.email} vs "rabo-6799de4b2c90-admin" =>`, await bcrypt.compare("rabo-6799de4b2c90-admin", r.passwordHash));
  }
};

run().catch((e: unknown) => { console.error(e); process.exit(1); });
