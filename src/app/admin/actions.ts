"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { labSession, person, weeklyBlock } from "@/db/schema";
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

export const createWeeklyBlock = async (formData: FormData) => {
  await requireAdmin();
  const fields = scheduleFields(formData);
  await db.insert(weeklyBlock).values(fields);
  refresh();
};

export const updateWeeklyBlock = async (formData: FormData) => {
  await requireAdmin();
  const id = Number(text(formData, "id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Choose a valid schedule block.");
  const fields = scheduleFields(formData);
  await db.update(weeklyBlock).set(fields).where(eq(weeklyBlock.id, id));
  refresh();
};

export const deleteWeeklyBlock = async (formData: FormData) => {
  await requireAdmin();
  const id = Number(text(formData, "id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("Choose a valid schedule block.");
  await db.delete(weeklyBlock).where(eq(weeklyBlock.id, id));
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
