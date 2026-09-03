import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== "test") {
  console.warn("DATABASE_URL is not set; database-backed pages will not load.");
}

const sql = neon(connectionString || "");
export const db = drizzle(sql, { schema });
