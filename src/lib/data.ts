import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { adminLog, blockAttendance, labSession, person, weeklyBlock } from "@/db/schema";
import { addDays, getLabNow, getLabToday, getMonday, getWeekdayIndex } from "@/lib/utils";

const publicMember = {
  id: person.id,
  fullName: person.fullName,
  researchArea: person.researchArea,
  color: person.color,
  active: person.active,
  adminOnly: person.adminOnly,
  sortOrder: person.sortOrder,
  weeklyRequiredHours: person.weeklyRequiredHours,
};

export const getHomeData = async ({ admin = false }: { admin?: boolean } = {}) => {
  const today = getLabToday();
  const monday = getMonday(today);
  const sunday = addDays(monday, 6);
  // The public board only shows people flagged admin_only when viewed from /admin.
  const visible = admin ? eq(person.active, true) : and(eq(person.active, true), eq(person.adminOnly, false));
  const [people, blocks, openSessions, attendance] = await Promise.all([
    db.select(publicMember).from(person).where(visible).orderBy(asc(person.sortOrder), asc(person.fullName)),
    db
      .select({ block: weeklyBlock, member: publicMember })
      .from(weeklyBlock)
      .innerJoin(person, eq(weeklyBlock.personId, person.id))
      .where(and(visible, lte(weeklyBlock.effectiveFrom, sunday), or(isNull(weeklyBlock.effectiveTo), gte(weeklyBlock.effectiveTo, monday))))
      .orderBy(asc(weeklyBlock.weekday), asc(weeklyBlock.startTime)),
    db
      .select({ session: labSession, member: publicMember })
      .from(labSession)
      .innerJoin(person, eq(labSession.personId, person.id))
      .where(and(eq(labSession.sessionDate, today), isNull(labSession.endTime), eq(person.active, true))),
    db
      .select({ weeklyBlockId: blockAttendance.weeklyBlockId, attendDate: blockAttendance.attendDate })
      .from(blockAttendance)
      .where(and(gte(blockAttendance.attendDate, monday), lte(blockAttendance.attendDate, sunday))),
  ]);

  return { today, monday, now: getLabNow(), todayWeekday: getWeekdayIndex(today), people, blocks, openSessions, attendance };
};

// Recent admin activity for the system-log strip on the admin pages.
export const getAdminLog = async (days = 7) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.select().from(adminLog).where(gte(adminLog.createdAt, since)).orderBy(desc(adminLog.createdAt)).limit(400);
};

export const getAdminToday = async () => {
  const today = getLabToday();
  const [people, sessions] = await Promise.all([
    db.select().from(person).orderBy(asc(person.active), asc(person.sortOrder), asc(person.fullName)),
    db
      .select({ session: labSession, member: person })
      .from(labSession)
      .innerJoin(person, eq(labSession.personId, person.id))
      .where(eq(labSession.sessionDate, today))
      .orderBy(asc(labSession.startTime)),
  ]);
  return { today, people, sessions };
};

export const getReportData = async (from: string, to: string) => {
  const safeFrom = from || getMonday(getLabToday());
  const safeTo = to || addDays(safeFrom, 6);
  // admin_only people (e.g. the full-time RA) are kept out of the hours tally.
  const [people, blocks, sessions] = await Promise.all([
    db.select().from(person).where(eq(person.adminOnly, false)).orderBy(asc(person.sortOrder), asc(person.fullName)),
    db
      .select({ block: weeklyBlock, member: person })
      .from(weeklyBlock)
      .innerJoin(person, eq(weeklyBlock.personId, person.id))
      .where(and(eq(person.adminOnly, false), lte(weeklyBlock.effectiveFrom, safeTo), or(isNull(weeklyBlock.effectiveTo), gte(weeklyBlock.effectiveTo, safeFrom)))),
    db
      .select({ session: labSession, member: person })
      .from(labSession)
      .innerJoin(person, eq(labSession.personId, person.id))
      .where(and(eq(person.adminOnly, false), gte(labSession.sessionDate, safeFrom), lte(labSession.sessionDate, safeTo)))
      .orderBy(asc(labSession.sessionDate), asc(labSession.startTime)),
  ]);
  return { from: safeFrom, to: safeTo, people, blocks, sessions };
};
