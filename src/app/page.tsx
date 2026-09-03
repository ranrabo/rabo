import { Suspense } from "react";
import { getHomeData } from "@/lib/data";
import { PublicBoard } from "@/components/public-board";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const { today, now, people, blocks, openSessions } = await getHomeData({ weekOf: d });
  return (
    <Suspense fallback={null}>
      <PublicBoard today={today} now={now} people={people} blocks={blocks} openSessions={openSessions} />
    </Suspense>
  );
}
