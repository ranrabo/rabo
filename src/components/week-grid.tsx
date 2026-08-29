import Link from "next/link";
import type { Person, WeeklyBlock } from "@/db/schema";
import { cn } from "@/lib/utils";
import { formatTime, hoursBetween, LONG_WEEKDAYS, WEEKDAYS } from "@/lib/utils";

type BlockWithMember = { block: WeeklyBlock; member: Person };

export const WeekGrid = ({ blocks, todayWeekday }: { blocks: BlockWithMember[]; todayWeekday: number }) => {
  const byDay = WEEKDAYS.map((_, weekday) => blocks.filter(({ block }) => block.weekday === weekday + 1));
  return (
    <div className="mt-7">
      <div className="hidden overflow-hidden rounded-[24px] border border-ink/15 bg-white lg:block">
        <div className="grid grid-cols-7 divide-x divide-ink/10">
          {WEEKDAYS.map((day, index) => (
            <div key={day} className="min-w-0">
              <div className={cn("border-b border-ink/10 px-4 py-4", todayWeekday === index && "bg-aqua/20")}>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-ink/45">{day}</p>
                {todayWeekday === index && <span className="mt-1 inline-block text-xs font-bold text-slate">Today</span>}
              </div>
              <div className="grid-paper relative h-[360px] p-2">
                <div className="absolute inset-x-0 top-[20%] border-t border-ink/10" />
                <div className="absolute inset-x-0 top-[40%] border-t border-ink/10" />
                <div className="absolute inset-x-0 top-[60%] border-t border-ink/10" />
                <div className="absolute inset-x-0 top-[80%] border-t border-ink/10" />
                {byDay[index].map(({ block, member }) => {
                  const start = Number(block.startTime.slice(0, 2)) * 60 + Number(block.startTime.slice(3, 5));
                  const end = Number(block.endTime.slice(0, 2)) * 60 + Number(block.endTime.slice(3, 5));
                  const top = Math.max(1, ((start - 480) / 600) * 100);
                  const height = Math.max(12, ((end - start) / 600) * 100);
                  return <Link href={`/people/${member.id}`} key={block.id} className="absolute left-2 right-2 overflow-hidden rounded-lg border-l-[3px] px-2 py-2 text-[11px] font-bold leading-tight text-ink transition hover:z-10 hover:scale-[1.02]" style={{ top: `${top}%`, height: `${height}%`, backgroundColor: `${member.color}26`, borderLeftColor: member.color }}><span className="block truncate">{member.fullName}</span><span className="mt-1 block truncate text-[10px] font-semibold opacity-65">{formatTime(block.startTime)}–{formatTime(block.endTime)}</span></Link>;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between border-t border-ink/10 px-4 py-3 text-[10px] font-semibold text-ink/40"><span>8 AM</span><span>11 AM</span><span>2 PM</span><span>5 PM</span><span>8 PM</span></div>
      </div>

      <div className="space-y-2 lg:hidden">
        {WEEKDAYS.map((day, index) => <div key={day} className={cn("rounded-2xl border border-ink/15 bg-white p-4", todayWeekday === index && "border-aqua bg-aqua/10")}>
          <div className="flex items-baseline justify-between"><p className="display text-lg font-bold">{LONG_WEEKDAYS[index]}</p>{todayWeekday === index && <span className="text-[10px] font-bold uppercase tracking-[.12em] text-slate">Today</span>}</div>
        </div>)}
      </div>
    </div>
  );
};

export const ScheduledTotals = ({ people, blocks }: { people: Person[]; blocks: BlockWithMember[] }) => {
  const totals = people.map((member) => ({ member, hours: blocks.filter(({ block }) => block.personId === member.id).reduce((sum, { block }) => sum + hoursBetween(block.startTime, block.endTime), 0) }));
  const total = totals.reduce((sum, entry) => sum + entry.hours, 0);
  return <div className="mt-7 grid gap-3 sm:grid-cols-[1.1fr_2fr]">
    <div className="rounded-[24px] bg-slate p-6 text-paper"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-aqua">All people</p><p className="display mt-3 text-5xl font-bold">{total % 1 ? total.toFixed(1) : total}<span className="ml-1 text-lg font-semibold text-paper/55">hrs</span></p><p className="mt-2 text-sm text-paper/60">scheduled this week</p></div>
    <div className="rounded-[24px] border border-ink/15 bg-white p-5"><div className="space-y-3">{totals.map(({ member, hours }) => <div key={member.id} className="flex items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: member.color }} /><Link href={`/people/${member.id}`} className="min-w-0 flex-1 truncate text-sm font-bold hover:text-coral">{member.fullName}</Link><span className="text-sm font-semibold text-ink/55">{hours % 1 ? hours.toFixed(1) : hours} h</span></div>)}</div></div>
  </div>;
};
