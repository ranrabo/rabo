"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { adminNote, blockAttendance, labSession, person, weeklyBlock } from "@/db/schema";
import { getLabToday } from "@/lib/utils";

const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("You must be signed in.");
  return session;
};

const text = (data: FormData, name: string) => String(data.get(name) || "").trim();
const email = (data: FormData) => text(data, "email").toLowerCase() || null;
const color = (data: FormData) => /^#[0-9a-f]{6}$/i.test(text(data, "color")) ? text(data, "color").toUpperCase() : "#EE7E61";
const refresh = () => { revalidatePath("/"); revalidatePath("/admin"); revalidatePath("/admin/report"); };

const scheduleTime = (value: string, fallback: string) => {
  const normalized = value.trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalized) ? normalized : fallback;
};

const scheduleFields = (formData: FormData) => {
  const personId = Number(text(formData, "personId"));
  const weekday = Number(text(formData, "weekday"));
  const startTime = scheduleTime(text(formData, "startTime"), "07:00");
  const endTime = scheduleTime(text(formData, "endTime"), "07:15");
  const effectiveFrom = /^\d{4}-\d{2}-\d{2}$/.test(text(formData, "effectiveFrom")) ? text(formData, "effectiveFrom") : getLabToday();

  if (!Number.isInteger(personId) || personId < 1) throw new Error("Choose a person for this block.");
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) throw new Error("Choose a valid day.");
  if (startTime < "07:00" || endTime > "19:00" || endTime <= startTime) throw new Error("Schedule blocks must be between 07:00 and 19:00.");
  if ([startTime, endTime].some((time) => Number(time.slice(3)) % 15 !== 0)) throw new Error("Schedule blocks must use 15-minute increments.");

  return { personId, weekday, startTime, endTime, effectiveFrom };
};

const expectedVersion = (formData: FormData) => {
  const raw = text(formData, "version");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const STALE_MESSAGE = "This block changed since you opened it. Refresh and try again.";

export const createWeeklyBlock = async (formData: FormData) => {
  const session = await requireAdmin();
  const fields = scheduleFields(formData);
  await db.insert(weeklyBlock).values({ ...fields, loggedBy: session.user?.name || "Admin" });
  refresh();
};

export const updateWeeklyBlock = async (formData: FormData) => {
  const session = await requireAdmin();
  const id = Number(text(formData, "id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Choose a valid schedule block.");
  const fields = scheduleFields(formData);
  const version = expectedVersion(formData);
  const where = version === null ? eq(weeklyBlock.id, id) : and(eq(weeklyBlock.id, id), eq(weeklyBlock.version, version));
  const saved = await db
    .update(weeklyBlock)
    .set({ ...fields, loggedBy: session.user?.name || "Admin", updatedAt: new Date(), version: sql`${weeklyBlock.version} + 1` })
    .where(where)
    .returning({ id: weeklyBlock.id });
  if (!saved.length) throw new Error(STALE_MESSAGE);
  refresh();
};

export const deleteWeeklyBlock = async (formData: FormData) => {
  await requireAdmin();
  const id = Number(text(formData, "id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Choose a valid schedule block.");
  const version = expectedVersion(formData);
  const where = version === null ? eq(weeklyBlock.id, id) : and(eq(weeklyBlock.id, id), eq(weeklyBlock.version, version));
  const removed = await db.delete(weeklyBlock).where(where).returning({ id: weeklyBlock.id });
  if (!removed.length) throw new Error(STALE_MESSAGE);
  refresh();
};

export const startSession = async (formData: FormData) => {
  const session = await requireAdmin();
  const personId = Number(text(formData, "personId"));
  await db.insert(labSession).values({ personId, sessionDate: getLabToday(), startTime: new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()), loggedBy: session.user?.name || "Admin" });
  refresh();
};

export const endSession = async (formData: FormData) => {
  await requireAdmin();
  const personId = Number(text(formData, "personId"));
  const open = await db.select({ id: labSession.id }).from(labSession).where(and(eq(labSession.personId, personId), eq(labSession.sessionDate, getLabToday()), isNull(labSession.endTime))).orderBy(desc(labSession.id)).limit(1);
  if (open[0]) await db.update(labSession).set({ endTime: new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()) }).where(eq(labSession.id, open[0].id));
  refresh();
};

export const createManualSession = async (formData: FormData) => {
  const session = await requireAdmin();
  const endTime = text(formData, "endTime");
  await db.insert(labSession).values({ personId: Number(text(formData, "personId")), sessionDate: text(formData, "sessionDate"), startTime: text(formData, "startTime"), endTime: endTime || null, loggedBy: session.user?.name || "Admin", note: text(formData, "note") || null });
  refresh();
};

export const updateSession = async (formData: FormData) => {
  const session = await requireAdmin();
  const endTime = text(formData, "endTime");
  await db.update(labSession).set({ personId: Number(text(formData, "personId")), sessionDate: text(formData, "sessionDate"), startTime: text(formData, "startTime"), endTime: endTime || null, note: text(formData, "note") || null, loggedBy: session.user?.name || "Admin" }).where(eq(labSession.id, Number(text(formData, "id"))));
  refresh();
};

export const deleteSession = async (formData: FormData) => {
  await requireAdmin();
  await db.delete(labSession).where(eq(labSession.id, Number(text(formData, "id"))));
  refresh();
};

export const addPerson = async (formData: FormData) => {
  await requireAdmin();
  await db.insert(person).values({ fullName: text(formData, "fullName"), email: email(formData), color: color(formData), researchArea: text(formData, "researchArea"), sortOrder: Number(text(formData, "sortOrder")) || 0 });
  refresh();
};

export const updatePerson = async (formData: FormData) => {
  await requireAdmin();
  await db.update(person).set({ fullName: text(formData, "fullName"), email: email(formData), color: color(formData), researchArea: text(formData, "researchArea"), sortOrder: Number(text(formData, "sortOrder")) || 0 }).where(eq(person.id, Number(text(formData, "id"))));
  refresh();
};

export const deactivatePerson = async (formData: FormData) => {
  await requireAdmin();
  await db.update(person).set({ active: false }).where(eq(person.id, Number(text(formData, "id"))));
  refresh();
};

const attendanceKey = (formData: FormData) => {
  const blockId = Number(text(formData, "blockId"));
  const date = text(formData, "date");
  if (!Number.isInteger(blockId) || blockId < 1) throw new Error("Choose a valid schedule block.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid date.");
  return { blockId, date };
};

export const confirmAttendance = async (formData: FormData) => {
  const session = await requireAdmin();
  const { blockId, date } = attendanceKey(formData);
  await db
    .insert(blockAttendance)
    .values({ weeklyBlockId: blockId, attendDate: date, loggedBy: session.user?.name || "Admin" })
    .onConflictDoNothing();
  refresh();
};

export const clearAttendance = async (formData: FormData) => {
  await requireAdmin();
  const { blockId, date } = attendanceKey(formData);
  await db.delete(blockAttendance).where(and(eq(blockAttendance.weeklyBlockId, blockId), eq(blockAttendance.attendDate, date)));
  refresh();
};

export const saveAdminNote = async (formData: FormData) => {
  const session = await requireAdmin();
  const body = String(formData.get("body") ?? "").slice(0, 8000);
  await db
    .insert(adminNote)
    .values({ id: 1, body, updatedBy: session.user?.name || "Admin", updatedAt: new Date() })
    .onConflictDoUpdate({ target: adminNote.id, set: { body, updatedBy: session.user?.name || "Admin", updatedAt: new Date() } });
  revalidatePath("/admin");
};

export const reorderPeople = async (formData: FormData) => {
  await requireAdmin();
  const ids = text(formData, "ids").split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) throw new Error("Nothing to reorder.");
  await Promise.all(ids.map((id, index) => db.update(person).set({ sortOrder: index + 1 }).where(eq(person.id, id))));
  refresh();
};
