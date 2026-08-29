"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Person, WeeklyBlock } from "@/db/schema";
import { formatTime, toMinutes, WEEKDAYS } from "@/lib/utils";

type BlockWithMember = { block: WeeklyBlock; member: Person };
type SessionWithMember = { session: { personId: number; startTime: string; endTime: string | null }; member: Person };

const hues = ["#EE7E61", "#A47351", "#D590B6", "#F28D9D", "#B5A131", "#459379", "#2095A6", "#5F70B3", "#A26A5F", "#668144", "#91517D", "#AB3A46", "#4F6E8F", "#7D7A86", "#D9A05B"];
const sundayColor = "#E0525A";
const dailyQuotes = [
  { text: "The journey of a thousand li commenced with a single step.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "The tree which fills the arms grew from the tiniest sprout.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "To win a hundred victories in a hundred battles is not the highest excellence.", source: "Sunzi · The Art of War, ch. 3" },
  { text: "To subdue the enemy without fighting is the highest excellence.", source: "Sunzi · The Art of War, ch. 3" },
  { text: "Some things are in our control and others not.", source: "Epictetus · Enchiridion, 1" },
  { text: "We are made perfect by habit.", source: "Aristotle · Nicomachean Ethics, II" },
  { text: "The most important part of education is right training in the nursery.", source: "Plato · Laws, VII" }
];
const dayStart = 7 * 60;
const dayEnd = 19 * 60;
const daySpan = dayEnd - dayStart;

const wash = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};

const dayPosition = (value: string) => ((toMinutes(value) - dayStart) / daySpan) * 100;
const timeLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

function HourAxis({ short = false }: { short?: boolean }) {
  return <div className={`relative ${short ? "h-[360px]" : "h-[672px]"}`} aria-hidden="true">{Array.from({ length: 13 }, (_, i) => <span key={i} className="absolute right-3 -translate-y-1/2 font-display text-[10px] font-medium tabular-nums text-ink/45" style={{ top: `${(i / 12) * 100}%` }}>{timeLabel(7 + i)}</span>)}</div>;
}

function DensityBand({ entries, short = false }: { entries: BlockWithMember[]; short?: boolean }) {
  return <div className={`relative border-l border-ink/20 ${short ? "h-[360px]" : "h-[672px]"}`} aria-label="room occupancy density">{Array.from({ length: 48 }, (_, i) => { const start = dayStart + i * 15; const count = entries.filter(({ block }) => toMinutes(block.startTime) <= start && toMinutes(block.endTime) > start).length; return <span key={i} className="absolute left-0 w-full bg-coral/45" style={{ top: `${(i / 48) * 100}%`, height: `${Math.max(0, 100 / 48 - .5)}%`, transform: `scaleX(${count ? Math.min(1, .18 + count / 8) : 0})`, transformOrigin: "left" }} />; })}</div>;
}

function DayExtras({ selectedDate, selectedDay, blocks }: { selectedDate: Date; selectedDay: number; blocks: BlockWithMember[] }) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const scheduledDays = new Set(blocks.map(({ block }) => block.weekday));
  const quote = dailyQuotes[(selectedDate.getDate() + month) % dailyQuotes.length];
  return <div className="grid gap-6 border-b-2 border-ink/20 px-5 py-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-12">
    <article className="bg-[#FFFDF9] bg-[linear-gradient(to_right,#EAEAEA_1px,transparent_1px),linear-gradient(to_bottom,#EAEAEA_1px,transparent_1px)] bg-[size:26px_26px] px-5 py-6 sm:px-7"><p className="font-display text-[10px] font-bold tracking-[.2em] text-ink/45">QUOTE OF THE DAY</p><p className="mt-8 max-w-xl font-display text-2xl font-medium leading-[1.2] tracking-[-.035em] text-ink/80 sm:text-3xl">“{quote.text}”</p><p className="mt-8 font-display text-[10px] font-bold tracking-[.12em] text-ink/40">{quote.source.toUpperCase()}</p></article>
    <aside className="border-l border-ink/15 pl-5 sm:pl-7"><div className="flex items-baseline justify-between"><p className="font-display text-[10px] font-bold tracking-[.18em] text-ink/50">{selectedDate.toLocaleString("en-US", { month: "short" }).toUpperCase()} {year}</p><span className="font-display text-[10px] text-ink/40">MONTH</span></div><div className="mt-4 grid grid-cols-7 gap-y-2 text-center font-display text-[10px] text-ink/55">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="font-bold">{day}</span>)}{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const weekday = (firstWeekday + index) % 7; const isSelected = day === selectedDate.getDate(); const hasSchedule = scheduledDays.has(weekday + 1); return <span key={day} className={`relative mx-auto flex h-6 w-6 items-center justify-center ${isSelected ? "rounded-full bg-slate font-bold text-paper-deep" : ""} ${weekday > 4 ? "text-coral/70" : ""}`} style={weekday > 4 && !isSelected ? { color: sundayColor } : undefined}>{day}{hasSchedule && !isSelected && <i className="absolute bottom-0.5 h-0.5 w-0.5 rounded-full bg-coral" />}</span>; })}</div><p className="mt-5 border-t border-ink/15 pt-3 font-display text-[10px] leading-4 text-ink/45">The small mark shows a scheduled lab day.</p></aside>
  </div>;
}

function PersonChip({ color, size = "md" }: { color: string; size?: "sm" | "md" }) {
  return <span className={size === "sm" ? "h-2.5 w-2.5 rounded-[2px]" : "h-3 w-3 rounded-[2px]"} style={{ backgroundColor: color, flex: "none" }} />;
}

function BlockBar({ entry, lane, laneCount, compact = false }: { entry: BlockWithMember; lane: number; laneCount: number; compact?: boolean }) {
  const { block, member } = entry;
  const color = hues[(member.id - 1) % hues.length];
  const left = compact ? "4%" : `calc(6px + ${lane} * (100% - 10px) / ${laneCount})`;
  const width = compact ? "92%" : `calc((100% - 10px) / ${laneCount} - 3px)`;
  return <Link href={`/people/${member.id}`} title={`${member.fullName}, ${formatTime(block.startTime)}–${formatTime(block.endTime)}`} className="absolute z-[1] overflow-hidden rounded-[2px] border-l-[3px] px-2 py-1.5 transition hover:z-10 hover:brightness-95" style={{ top: `${dayPosition(block.startTime)}%`, height: `${Math.max(((toMinutes(block.endTime) - toMinutes(block.startTime)) / daySpan) * 100, compact ? 5 : 3.8)}%`, left, width, backgroundColor: wash(color, .16), borderLeftColor: color }}><span className="block truncate font-display text-[11px] font-bold leading-tight">{member.fullName}</span><span className="mt-1 block truncate text-[10px] font-medium text-ink/60">{formatTime(block.startTime)}–{formatTime(block.endTime)}</span></Link>;
}

function DayTimeline({ entries, mobile = false, short = false }: { entries: BlockWithMember[]; mobile?: boolean; short?: boolean }) {
  const lanes: BlockWithMember[][] = [];
  const laneFor = new Map<number, number>();
  [...entries].sort((a, b) => toMinutes(a.block.startTime) - toMinutes(b.block.startTime)).forEach((entry) => {
    let lane = 0;
    while (lanes[lane]?.some((other) => toMinutes(other.block.endTime) > toMinutes(entry.block.startTime))) lane += 1;
    lanes[lane] ??= [];
    lanes[lane].push(entry);
    laneFor.set(entry.block.id, lane);
  });
  const maxLane = Math.max(lanes.length, 1);
  const hourHeight = short ? 30 : mobile ? 34 : 56;
  const plannerGrid = `repeating-linear-gradient(to bottom, rgba(180,180,180,.65) 0 1px, transparent 1px ${hourHeight * 2}px),repeating-linear-gradient(to bottom, rgba(210,210,210,.8) 0 1px, transparent 1px ${hourHeight}px),repeating-linear-gradient(to bottom, #EAEAEA 0 1px, transparent 1px ${hourHeight / 4}px),repeating-linear-gradient(to right, #EAEAEA 0 1px, transparent 1px 26px)`;
  return <div className={short ? "relative h-[360px]" : mobile ? "relative h-[408px]" : "relative h-[672px]"} style={{ backgroundImage: plannerGrid }}>
    {entries.map((entry) => <BlockBar key={entry.block.id} entry={entry} lane={laneFor.get(entry.block.id) || 0} laneCount={maxLane} compact={mobile} />)}
  </div>;
}

function TodayList({ entries, openSessions }: { entries: BlockWithMember[]; openSessions: SessionWithMember[] }) {
  const scheduledIds = new Set(entries.map(({ member }) => member.id));
  const rows = [...entries.map(({ block, member }) => ({ member, start: block.startTime, end: block.endTime })), ...openSessions.filter(({ member }) => !scheduledIds.has(member.id)).map(({ session, member }) => ({ member, start: session.startTime, end: "Now" }))];
  return <div>
    {rows.length ? rows.map(({ member, start, end }) => <Link href={`/people/${member.id}`} key={member.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-ink/10 py-1.5 transition hover:bg-ink/[.03]"><span className="flex min-w-0 items-center gap-2.5"><span className="h-7 w-1 rounded-[1px]" style={{ backgroundColor: hues[(member.id - 1) % hues.length] }} /><span className="truncate font-display text-sm font-bold">{member.fullName}</span></span><span className="shrink-0 font-display text-[11px] tabular-nums text-ink/55">{formatTime(start)}–{end === "Now" ? "now" : formatTime(end)}</span></Link>) : <p className="border-l-2 border-coral pl-3 text-sm leading-6 text-ink/70">Nobody has hours today.</p>}
  </div>;
}

export function PublicBoard({ today, monday, now, todayWeekday, people, blocks, openSessions }: { today: string; monday: string; now: string; todayWeekday: number; people: Person[]; blocks: BlockWithMember[]; openSessions: SessionWithMember[] }) {
  const [selectedDay, setSelectedDay] = useState(todayWeekday);
  const [clock, setClock] = useState(now);
  useEffect(() => {
    const tick = () => setClock(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const byDay = useMemo(() => WEEKDAYS.map((_, index) => blocks.filter(({ block }) => block.weekday === index + 1)), [blocks]);
  const currentEntries = byDay[selectedDay];
  const dateForDay = (index: number) => new Date(`${monday}T12:00:00`).setDate(new Date(`${monday}T12:00:00`).getDate() + index);
  const dateLabel = (index: number) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dateForDay(index)));
  const fullDate = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${today}T12:00:00`)).toUpperCase();
  const totalHours = blocks.reduce((sum, { block }) => sum + (toMinutes(block.endTime) - toMinutes(block.startTime)) / 60, 0);
  const selectedDate = new Date(dateForDay(selectedDay));
  const selectedMonthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(selectedDate).toUpperCase();
  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedDayNumber = selectedDate.getDate();
  const selectedKanji = ["月", "火", "水", "木", "金", "土", "日"][selectedDay];
  const monthAccent = hues[selectedDate.getMonth()];
  const dateAccent = selectedDay === 6 ? sundayColor : monthAccent;
  return <div className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-8">
    <section className="mx-auto max-w-[1280px] overflow-hidden border-x border-b border-ink/20 bg-[#FFFDF9] shadow-[0_16px_50px_rgba(43,41,38,.08)]">
      <div className="flex items-center justify-between gap-4 border-b border-ink/20 bg-paper-deep px-5 py-4 sm:px-10">
        <Link href="/" aria-label="RABO home" className="flex items-end gap-3"><span className="font-display text-2xl font-extrabold tracking-[-.06em]">RABO</span><span className="text-sm font-extrabold tracking-[.16em]" style={{ color: monthAccent }}>ランラボ</span></Link>
        <a href="https://yangran.org/" target="_blank" rel="noreferrer" className="border border-ink/25 px-3 py-2 font-display text-[11px] font-bold tracking-[.08em] text-ink/60 transition hover:border-ink/60 hover:text-ink">yangran.org ↗</a>
      </div>
      <div className="border-b border-ink/10 px-5 py-1.5 sm:px-10" style={{ backgroundColor: monthAccent }} />
      <div className="grid gap-8 px-5 pb-6 pt-8 sm:px-10 sm:pb-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><div className="flex items-end gap-3 sm:gap-5"><div className="flex items-end gap-2 font-display leading-none" style={{ color: dateAccent }}><span className="self-start pt-1 text-2xl font-extrabold sm:text-3xl">{selectedMonth}</span><span className="text-[6.5rem] font-extrabold tracking-[-.1em] sm:text-[8rem]">{selectedDayNumber}</span></div><div className="flex flex-col items-center gap-1 pb-2"><span className="font-display text-3xl font-extrabold leading-none text-ink/70 sm:text-4xl">{selectedKanji}</span><span className="font-display text-sm font-extrabold tracking-[.16em] text-ink/65 sm:text-base">{WEEKDAYS[selectedDay].toUpperCase()}</span></div></div><p className="mt-3 font-display text-sm font-medium tracking-[.18em] text-ink/55">{selectedMonthYear}</p><div className="mt-5 flex items-center gap-2 font-display text-sm font-extrabold tabular-nums"><span className="h-2 w-2 animate-pulse rounded-full bg-coral" />{clock}<span className="text-[10px] font-medium tracking-[.14em] text-ink/55">LAB TIME</span></div><div className="mt-4 flex gap-2"><button onClick={() => setSelectedDay((selectedDay + 6) % 7)} className="flex min-h-11 items-center gap-2 border border-ink/35 px-3 font-display text-xs font-bold tracking-[.04em] transition hover:bg-ink/5"><ChevronLeft size={15} />{WEEKDAYS[(selectedDay + 6) % 7]}</button><button onClick={() => setSelectedDay((selectedDay + 1) % 7)} className="flex min-h-11 items-center gap-2 border border-ink/35 px-3 font-display text-xs font-bold tracking-[.04em] transition hover:bg-ink/5">{WEEKDAYS[(selectedDay + 1) % 7]}<ChevronRight size={15} /></button></div></div></div>
        <div className="self-end"><TodayList entries={currentEntries} openSessions={openSessions} /></div>
      </div>
      <div className="grid gap-8 border-b-2 border-ink/20 px-5 pb-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        <div className="grid grid-cols-[52px_16px_minmax(0,1fr)] border-t-2 border-ink/20 sm:grid-cols-[82px_22px_minmax(0,1fr)]"><HourAxis /><DensityBand entries={currentEntries} /><div className="min-w-0"><DayTimeline entries={currentEntries} /></div></div>
      </div>
      <DayExtras selectedDate={selectedDate} selectedDay={selectedDay} blocks={blocks} />
      <section className="px-5 pb-10 pt-8 sm:px-10 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="font-display text-[11px] font-bold tracking-[.18em] text-ink/55">THE WEEK</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-[-.03em]">{dateLabel(0)}–{dateLabel(4)} {fullDate}</h2></div><div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-ink/55"><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-ink bg-ink/10" /> booked</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-coral bg-coral/15" /> in now</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[2px] border-dashed border-ink bg-ink/10" /> one-off</span></div></div>
        <div className="hidden overflow-hidden border-t-2 border-ink/20 lg:block"><div className="grid grid-cols-[52px_repeat(5,minmax(0,1fr))] divide-x divide-ink/15"><div className="border-b border-ink/15 px-2 py-3 font-display text-[10px] font-bold tracking-[.18em] text-ink/55">TIME</div>{WEEKDAYS.slice(0, 5).map((day, index) => <button onClick={() => setSelectedDay(index)} key={day} className={`text-left ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><div className={`border-b border-ink/15 px-3 py-3 ${selectedDay === index ? "text-coral" : ""}`}><span className="font-display text-sm font-extrabold tracking-[.12em]">{day.toUpperCase()}</span><span className="ml-2 font-display text-xs text-ink/50">{dateLabel(index)}</span></div></button>)}<div><HourAxis short /></div>{WEEKDAYS.slice(0, 5).map((day, index) => <button onClick={() => setSelectedDay(index)} key={`timeline-${day}`} className={`relative min-w-0 px-1.5 text-left ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><DayTimeline entries={byDay[index]} short /></button>)}</div></div>
        <div className="space-y-0 border-t-2 border-ink/20 lg:hidden">{WEEKDAYS.slice(0, 5).map((day, index) => <button onClick={() => setSelectedDay(index)} key={day} className={`flex w-full items-center gap-3 border-b border-ink/15 px-1 py-3 text-left ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><span className="w-14 font-display text-xs font-extrabold tracking-[.1em]">{day.toUpperCase()}<small className="mt-0.5 block font-medium tracking-normal text-ink/55">{dateLabel(index)}</small></span><span className="relative h-12 flex-1 border-b border-ink/25"><span className="absolute inset-y-0 left-0 right-0 flex items-end gap-px">{Array.from({ length: 48 }, (_, slot) => { const start = 7 * 60 + slot * 15; const count = byDay[index].filter(({ block }) => toMinutes(block.startTime) <= start && toMinutes(block.endTime) > start).length; return <i key={slot} className="flex-1 bg-slate" style={{ height: `${count ? Math.max(15, count * 24) : 0}%`, opacity: count ? .78 : 0 }} />; })}</span></span></button>)}</div>
        <p className="mb-3 mt-8 border-t-2 border-ink/20 pt-4 font-display text-[11px] font-bold tracking-[.18em] text-ink/55">WHO IS WHICH COLOUR</p><div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">{people.map((member) => <Link href={`/people/${member.id}`} key={member.id} className="flex min-w-0 items-center gap-2.5 border-b border-ink/10 py-2 transition hover:text-coral"><PersonChip color={hues[(member.id - 1) % hues.length]} size="sm" /><span className="truncate font-display text-[13px] font-bold">{member.fullName}</span></Link>)}</div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/20 bg-paper-deep px-5 py-4 font-display text-[10px] font-medium tracking-[.14em] text-ink/50 sm:px-10"><span>RABO.YANGRAN.ORG · © Yang Ran 2026</span><span className="flex flex-wrap items-center justify-end gap-4"><span>07:00–19:00 · AMERICA/NEW_YORK · {totalHours.toFixed(1)} H SCHEDULED</span><Link href="/admin" className="font-medium tracking-[.08em] text-ink/35 transition hover:text-coral">管理者ログイン</Link></span></footer>
    </section>
  </div>;
}
