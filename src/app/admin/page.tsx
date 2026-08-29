import { getHomeData } from "@/lib/data";
import { PublicBoard } from "@/components/public-board";
import { AdminScheduleEditor } from "@/components/admin-schedule-editor";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { today, now, people, blocks, openSessions } = await getHomeData();
  return <div className="space-y-8 py-8"><AdminScheduleEditor today={today} people={people} blocks={blocks} /><div><div className="mx-auto w-full max-w-[1280px] px-4 pb-3 sm:px-8"><p className="font-display text-[10px] font-extrabold uppercase tracking-[.18em] text-ink/45">Live preview</p><p className="mt-1 text-sm text-ink/50">This is the public board visitors see after your saved changes.</p></div><PublicBoard today={today} now={now} people={people} blocks={blocks} openSessions={openSessions} /></div></div>;
}
