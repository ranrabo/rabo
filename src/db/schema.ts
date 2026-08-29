import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const person = pgTable(
  "person",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").unique(),
    color: text("color").notNull().default("#EE7E61"),
    researchArea: text("research_area").notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    weeklyRequiredHours: integer("weekly_required_hours").notNull().default(0),
  },
  (table) => [check("person_color_hex", sql`${table.color} ~ '^#[0-9A-Fa-f]{6}$'`)],
);

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
    version: integer("version").notNull().default(1),
    loggedBy: text("logged_by"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("weekly_block_weekday_idx").on(table.weekday),
    check("weekly_block_weekday_range", sql`${table.weekday} between 1 and 7`),
    check("weekly_block_time_order", sql`${table.endTime} > ${table.startTime}`),
    check("weekly_block_effective_order", sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`),
  ],
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

// One row per (recurring block, calendar date) that an admin has confirmed the
// person attended in full. Absence of a row = not confirmed.
export const blockAttendance = pgTable(
  "block_attendance",
  {
    id: serial("id").primaryKey(),
    weeklyBlockId: integer("weekly_block_id")
      .notNull()
      .references(() => weeklyBlock.id, { onDelete: "cascade" }),
    attendDate: date("attend_date").notNull(),
    loggedBy: text("logged_by"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("block_attendance_block_date_idx").on(table.weeklyBlockId, table.attendDate)],
);

export const appUser = pgTable("app_user", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
});

// Free-text admin scratchpad, one per calendar day (keyed by note_date).
export const adminNote = pgTable("admin_note", {
  noteDate: date("note_date").primaryKey(),
  body: text("body").notNull().default(""),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// Append-only trail of what each admin changed, shown as the system log.
export const adminLog = pgTable(
  "admin_log",
  {
    id: serial("id").primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("admin_log_created_idx").on(table.createdAt)],
);

export const personRelations = relations(person, ({ many }) => ({
  weeklyBlocks: many(weeklyBlock),
  labSessions: many(labSession),
  progressEntries: many(progressEntry),
}));

export const weeklyBlockRelations = relations(weeklyBlock, ({ one, many }) => ({
  person: one(person, { fields: [weeklyBlock.personId], references: [person.id] }),
  attendance: many(blockAttendance),
}));

export const blockAttendanceRelations = relations(blockAttendance, ({ one }) => ({
  block: one(weeklyBlock, { fields: [blockAttendance.weeklyBlockId], references: [weeklyBlock.id] }),
}));

export const labSessionRelations = relations(labSession, ({ one }) => ({
  person: one(person, { fields: [labSession.personId], references: [person.id] }),
}));

export const progressEntryRelations = relations(progressEntry, ({ one }) => ({
  person: one(person, { fields: [progressEntry.personId], references: [person.id] }),
}));

export type Person = typeof person.$inferSelect;
export type PublicPerson = Pick<Person, "id" | "fullName" | "researchArea" | "active" | "sortOrder" | "color" | "weeklyRequiredHours">;
export type WeeklyBlock = typeof weeklyBlock.$inferSelect;
export type LabSession = typeof labSession.$inferSelect;
export type ProgressEntry = typeof progressEntry.$inferSelect;
export type BlockAttendance = typeof blockAttendance.$inferSelect;
export type AdminNote = typeof adminNote.$inferSelect;
export type AdminLog = typeof adminLog.$inferSelect;
