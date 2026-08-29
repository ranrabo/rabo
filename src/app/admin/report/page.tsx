import Link from "next/link";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { getReportData } from "@/lib/data";
import { addDays, formatHours, getMonday, getLabToday, hoursBetween } from "@/lib/utils";
import { isLabDate } from "@/lib/term";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CsvDownload, type CsvRow } from "@/components/csv-download";

export const dynamic = "force-dynamic";

// Scheduled weekday occurrences in the range, skipping days the lab is closed
// (out of term, breaks, holidays) so those don't inflate the scheduled total.
const countWeekday = (from: string, to: string, weekday: number) => {
  let count = 0;
  for (let current = from; current <= to; current = addDays(current, 1)) {
    const day = new Date(`${current}T12:00:00`).getDay();
    if ((day === 0 ? 6 : day - 1) === weekday && isLabDate(current)) count += 1;
  }
  return count;
};

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const query = await searchParams;
  const today = getLabToday();
  const from = query.from || getMonday(today);
  const to = query.to || addDays(from, 6);
  const { people, blocks, sessions } = await getReportData(from, to);
  const rows = people.map((member) => {
    const scheduled = blocks.filter(({ block }) => block.personId === member.id).reduce((sum, { block }) => sum + hoursBetween(block.startTime, block.endTime) * countWeekday(from, to, block.weekday - 1), 0);
    const logged = sessions.filter(({ session }) => session.personId === member.id).reduce((sum, { session }) => sum + hoursBetween(session.startTime, session.endTime), 0);
    return { member, scheduled, logged, difference: logged - scheduled };
  });
  const totalScheduled = rows.reduce((sum, row) => sum + row.scheduled, 0);
  const totalLogged = rows.reduce((sum, row) => sum + row.logged, 0);
  const csvRows: CsvRow[] = rows.map(({ member, scheduled, logged, difference }) => ({ person: member.fullName, scheduled: scheduled.toFixed(2), logged: logged.toFixed(2), difference: difference.toFixed(2) }));
  return <div className="space-y-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-ink/50 hover:text-coral"><ArrowLeft size={15} /> Back to log</Link><p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral">A wider view</p><h2 className="display mt-2 text-3xl font-bold sm:text-4xl">Room report</h2><p className="mt-2 text-sm text-ink/55">Scheduled rhythm alongside what was actually logged.</p></div><CsvDownload rows={csvRows} from={from} to={to} /></div>
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink/15 bg-white p-4"><div><Label htmlFor="from">From</Label><Input id="from" name="from" type="date" defaultValue={from} /></div><div><Label htmlFor="to">To</Label><Input id="to" name="to" type="date" defaultValue={to} /></div><Button type="submit" className="bg-aqua text-ink hover:bg-aqua/80"><CalendarRange size={16} /> Update range</Button></form>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate p-5 text-paper"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-aqua">Scheduled</p><p className="display mt-2 text-4xl font-bold">{formatHours(totalScheduled)}</p></div><div className="rounded-2xl bg-coral p-5 text-ink"><p className="text-[10px] font-bold uppercase tracking-[.16em]">Logged</p><p className="display mt-2 text-4xl font-bold">{formatHours(totalLogged)}</p></div></div>
    <div className="overflow-hidden rounded-[24px] border border-ink/15 bg-white"><div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr] border-b border-ink/10 bg-paper-deep px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-ink/50 sm:grid"><span>Person</span><span>Scheduled</span><span>Logged</span><span>Difference</span></div>{rows.map(({ member, scheduled, logged, difference }) => <div key={member.id} className="grid gap-2 border-b border-ink/10 px-5 py-4 last:border-0 sm:grid-cols-[1.5fr_1fr_1fr_1fr] sm:items-center"><div><span className="font-bold">{member.fullName}</span><span className="block text-xs text-ink/45 sm:hidden">Scheduled {formatHours(scheduled)} · Logged {formatHours(logged)}</span></div><span className="hidden text-sm font-semibold text-ink/65 sm:block">{formatHours(scheduled)}</span><span className="hidden text-sm font-semibold text-ink/65 sm:block">{formatHours(logged)}</span><span className={`text-sm font-bold ${difference < 0 ? "text-coral" : "text-ink/60"}`}>{difference > 0 ? "+" : ""}{formatHours(difference)}</span></div>)}</div>
  </div>;
}
