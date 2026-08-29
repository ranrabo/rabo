import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { appUser } from "./schema";

config({ path: ".env.local" });

const username = process.argv[2] || "ranrabo";
const password = process.argv[3];

if (!password || password.length < 12) {
  console.error("Usage: npx tsx src/db/reset-user.ts <username> <password (>=12 chars)>");
  process.exit(1);
}

const run = async () => {
  const { db } = await import("./index");
  await db.delete(appUser);
  await db.insert(appUser).values({
    email: username.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    displayName: username,
  });
  console.log(`Admin account reset. Sign in at /login with:\n  username: ${username.toLowerCase()}\n  password: (the one you just passed)`);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
