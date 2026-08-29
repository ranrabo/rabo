import { getHomeData } from "@/lib/data";
import { PublicBoard } from "@/components/public-board";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { today, now, people, blocks, openSessions } = await getHomeData();
  return <PublicBoard today={today} now={now} people={people} blocks={blocks} openSessions={openSessions} />;
}
