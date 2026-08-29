import { getHomeData } from "@/lib/data";
import { PublicBoard } from "@/components/public-board";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { today, now, people, blocks, openSessions } = await getHomeData();
  return (
    <div className="py-8">
      <PublicBoard today={today} now={now} people={people} blocks={blocks} openSessions={openSessions} admin />
    </div>
  );
}
