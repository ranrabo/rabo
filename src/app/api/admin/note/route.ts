import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { adminNote } from "@/db/schema";

export const dynamic = "force-dynamic";

// The admin note for one calendar day. Fetched by the board's Notes box as the
// admin moves between days.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ body: "" }, { status: 401 });

  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ body: "" }, { status: 400 });

  const [row] = await db.select({ body: adminNote.body }).from(adminNote).where(eq(adminNote.noteDate, date)).limit(1);
  return Response.json({ body: row?.body ?? "" });
}
