import Link from "next/link";
import { ArrowDownRight, CalendarDays } from "lucide-react";
import { getHomeData } from "@/lib/data";
import { formatDate, formatTime, LONG_WEEKDAYS } from "@/lib/utils";
import { NowInLab } from "@/components/now-in-lab";
import { ScheduledTotals } from "@/components/week-grid";
import { WeekGrid } from "@/components/week-grid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { today, now, todayWeekday, people, blocks, openSessions } = await getHomeData();
  const todayBlocks = blocks.filter(({ block }) => block.weekday === todayWeekday + 1);
  return <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-8">
    <section className="relative overflow-hidden border-b border-ink/15 py-12 sm:py-20">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[30px] border-coral/20" />
      <div className="relative max-w-3xl"><p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-coral"><span className="h-2 w-2 rounded-full bg-coral" /> Shared room, shared rhythm</p><h1 className="display max-w-2xl text-[clamp(3.5rem,9vw,7.8rem)] font-bold leading-[.86]">Who’s in<br /><span className="text-slate">the lab<span className="text-coral">?</span></span></h1><p className="mt-8 max-w-md text-base leading-7 text-ink/65">A living view of the week in our shared research space. Check the current room rhythm, then find a person’s area of work.</p></div>
    </section>

    <section className="border-b border-ink/15 py-10 sm:py-14"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral">01 / Right now</p><h2 className="display mt-2 text-3xl font-bold sm:text-4xl">Today in the room</h2></div><p className="flex items-center gap-2 text-sm font-semibold text-ink/55"><CalendarDays size={16} /> {formatDate(today)}</p></div><NowInLab initialTime={now} openSessions={openSessions} todayBlocks={todayBlocks} /></section>

    <section className="border-b border-ink/15 py-10 sm:py-14"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral">02 / The recurring shape</p><h2 className="display mt-2 text-3xl font-bold sm:text-4xl">This week</h2></div><p className="flex items-center gap-2 text-sm font-semibold text-ink/55"><ArrowDownRight size={16} /> {LONG_WEEKDAYS[todayWeekday]} is highlighted</p></div><WeekGrid blocks={blocks} todayWeekday={todayWeekday} /></section>

    <section className="py-10 sm:py-14"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral">03 / The sum of the shape</p><h2 className="display mt-2 text-3xl font-bold sm:text-4xl">Scheduled hours</h2><ScheduledTotals people={people} blocks={blocks} /></section>
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 pt-6 text-sm text-ink/45"><span>rabo / lab occupancy</span><Link href="/admin" className="font-bold text-ink/65 hover:text-coral">Log a session →</Link></footer>
  </div>;
}
