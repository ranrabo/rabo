import { getHomeData } from "@/lib/data";
import { PublicBoard } from "@/components/public-board";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { today, monday, now, todayWeekday, people, blocks, openSessions } = await getHomeData();
  return <PublicBoard today={today} monday={monday} now={now} todayWeekday={todayWeekday} people={people} blocks={blocks} openSessions={openSessions} />;
}
