import { Suspense } from "react";
import { getHomeData } from "@/lib/data";
import { PublicBoard } from "@/components/public-board";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { today, now, people, blocks, openSessions, attendance } = await getHomeData();
  return (
    <Suspense fallback={null}>
      <PublicBoard today={today} now={now} people={people} blocks={blocks} openSessions={openSessions} attendance={attendance} admin />
    </Suspense>
  );
}
