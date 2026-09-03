import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { appUser } from "./schema";

// Usage:
//   npx tsx src/db/reset-user.ts <username> <password (>=12 chars)> [envFile] --force
// envFile defaults to .env.local. Pass e.g. .env.production.local to target prod.
// This DELETES EVERY row in app_user before inserting the one account, so it
// requires an explicit --force flag.
const args = process.argv.slice(2);
const force = args.includes("--force");
const [username = "ranrabo", password, envFile = ".env.local"] = args.filter((arg) => arg !== "--force");

config({ path: envFile });

if (!password || password.length < 12) {
  console.error("Usage: npx tsx src/db/reset-user.ts <username> <password (>=12 chars)> [envFile] --force");
  process.exit(1);
}

if (!force) {
  console.error(`Refusing to run without --force: this wipes ALL app_user rows (env file: ${envFile}).`);
  process.exit(1);
}

const run = async () => {
  const { db } = await import("./index");
  console.log("env file:", envFile);
  console.log("DATABASE_URL host:", (process.env.DATABASE_URL || "").replace(/.*@/, "").split(/[/?]/)[0]);
  await db.delete(appUser);
  await db.insert(appUser).values({
    email: username.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    displayName: username,
  });
  const rows = await db.select().from(appUser);
  console.log("rows now:", rows.map((r) => ({ id: r.id, email: r.email })));
  console.log(`\nSign in at /login with:\n  username: ${username.toLowerCase()}\n  password: (the one you just passed)`);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
