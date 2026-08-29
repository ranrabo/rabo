import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { appUser } from "./schema";

// Usage:
//   npx tsx src/db/reset-user.ts <username> <password (>=12 chars)> [envFile]
// envFile defaults to .env.local. Pass e.g. .env.production.local to target prod.
const username = process.argv[2] || "ranrabo";
const password = process.argv[3];
const envFile = process.argv[4] || ".env.local";

config({ path: envFile });

if (!password || password.length < 12) {
  console.error("Usage: npx tsx src/db/reset-user.ts <username> <password (>=12 chars)> [envFile]");
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
