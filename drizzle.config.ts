import { defineConfig } from "drizzle-kit";

// drizzle-kit loads .env / .env.local automatically.
// generate/diff don't need a connection; push/migrate/studio use dbCredentials.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
