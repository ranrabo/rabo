import type { NextRequest } from "next/server";
import { and, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { blockAttendance } from "@/db/schema";
import { addDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Confirmed-attendance rows for one lab week (Mon–Sun). The board fetches this as
// the admin pages between weeks so the confirm state reflects the week on screen,
// not just the week that "today" falls in.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ attendance: [] }, { status: 401 });

  const monday = request.nextUrl.searchParams.get("monday") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(monday)) return Response.json({ attendance: [] }, { status: 400 });
  const sunday = addDays(monday, 6);

  const rows = await db
    .select({ weeklyBlockId: blockAttendance.weeklyBlockId, attendDate: blockAttendance.attendDate })
    .from(blockAttendance)
    .where(and(gte(blockAttendance.attendDate, monday), lte(blockAttendance.attendDate, sunday)));
  return Response.json({ attendance: rows });
}
