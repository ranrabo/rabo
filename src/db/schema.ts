import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  time,
  timestamp,
} from "drizzle-orm/pg-core";

export const person = pgTable("person", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").unique(),
  color: text("color").notNull().default("#EE7E61"),
  researchArea: text("research_area").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const weeklyBlock = pgTable(
  "weekly_block",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
  },
  (table) => [index("weekly_block_weekday_idx").on(table.weekday)],
);

export const labSession = pgTable(
  "lab_session",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => person.id),
    sessionDate: date("session_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time"),
    loggedBy: text("logged_by").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("lab_session_date_idx").on(table.sessionDate)],
);

export const progressEntry = pgTable(
  "progress_entry",
  {
    id: serial("id").primaryKey(),
    personId: integer("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    progressDate: date("progress_date").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("in_progress"),
    value: text("value"),
    note: text("note"),
    loggedBy: text("logged_by").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("progress_entry_person_date_idx").on(table.personId, table.progressDate)],
);

export const appUser = pgTable("app_user", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
});

export const personRelations = relations(person, ({ many }) => ({
  weeklyBlocks: many(weeklyBlock),
  labSessions: many(labSession),
  progressEntries: many(progressEntry),
}));

export const weeklyBlockRelations = relations(weeklyBlock, ({ one }) => ({
  person: one(person, { fields: [weeklyBlock.personId], references: [person.id] }),
}));

export const labSessionRelations = relations(labSession, ({ one }) => ({
  person: one(person, { fields: [labSession.personId], references: [person.id] }),
}));

export const progressEntryRelations = relations(progressEntry, ({ one }) => ({
  person: one(person, { fields: [progressEntry.personId], references: [person.id] }),
}));

export type Person = typeof person.$inferSelect;
export type PublicPerson = Pick<Person, "id" | "fullName" | "researchArea" | "active" | "sortOrder" | "color">;
export type WeeklyBlock = typeof weeklyBlock.$inferSelect;
export type LabSession = typeof labSession.$inferSelect;
export type ProgressEntry = typeof progressEntry.$inferSelect;
