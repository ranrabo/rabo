"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicPerson, WeeklyBlock } from "@/db/schema";
import { addDays, formatTime, getMonday, toMinutes, WEEKDAYS } from "@/lib/utils";

type BlockWithMember = { block: WeeklyBlock; member: PublicPerson };
type SessionWithMember = { session: { personId: number; startTime: string; endTime: string | null }; member: PublicPerson };

const hues = ["#EE7E61", "#A47351", "#D590B6", "#F28D9D", "#B5A131", "#459379", "#2095A6", "#5F70B3", "#A26A5F", "#668144", "#91517D", "#AB3A46", "#4F6E8F", "#7D7A86", "#D9A05B"];
const sundayColor = "#E0525A";
const dailyQuotes = [
  { text: "The tree which fills the arms grew from the tiniest sprout; the tower of nine storeys rose from a small heap of earth.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "The journey of a thousand li commenced with a single step. If you are careful at the end as at the beginning, you will not ruin your work.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "To win a hundred victories in a hundred battles is not the highest excellence; to subdue the enemy without fighting is.", source: "Sunzi · The Art of War, ch. 3" },
  { text: "Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking resistance without fighting.", source: "Sunzi · The Art of War, ch. 3" },
  { text: "The things in our control are by nature free, unrestrained, unhindered; those not in our control are weak and restrained.", source: "Epictetus · Enchiridion, 1" },
  { text: "We are adapted by nature to receive virtue, and are made perfect by habit.", source: "Aristotle · Nicomachean Ethics, II" },
  { text: "The most important part of education is right training in the nursery; practice makes the work take root.", source: "Plato · Laws, VII" }
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
  return <div className={`relative ${short ? "h-[360px]" : "h-[672px]"}`} aria-hidden="true">{Array.from({ length: 13 }, (_, i) => <span key={i} className="absolute right-3 -translate-y-1/2 font-display text-[10px] font-medium tabular-nums text-ink/45" style={{ top: `${(i / 12) * 100}%` }}>{i === 0 || i % 2 === 0 ? "–" : timeLabel(7 + i)}</span>)}</div>;
}

function DensityBand({ entries, short = false, color }: { entries: BlockWithMember[]; short?: boolean; color: string }) {
  return <div className={`relative border-l ${short ? "h-[360px]" : "h-[672px]"}`} style={{ borderLeftColor: wash(color, .55) }} aria-label="room occupancy density">{Array.from({ length: 48 }, (_, i) => { const start = dayStart + i * 15; const count = entries.filter(({ block }) => toMinutes(block.startTime) <= start && toMinutes(block.endTime) > start).length; return <span key={i} className="absolute left-0 w-full" style={{ top: `${(i / 48) * 100}%`, height: `${Math.max(0, 100 / 48 - .5)}%`, transform: `scaleX(${count ? Math.min(1, .18 + count / 8) : 0})`, transformOrigin: "left", backgroundColor: wash(color, .55) }} />; })}</div>;
}

function DayExtras({ selectedDate, selectedDay, blocks }: { selectedDate: Date; selectedDay: number; blocks: BlockWithMember[] }) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const quote = dailyQuotes[(selectedDate.getDate() + month) % dailyQuotes.length];
  return <div className="grid gap-6 px-5 py-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-12">
    <article className="bg-[#FFFDF9] px-5 py-6 sm:px-7"><p className="font-display text-[10px] font-bold tracking-[.2em] text-ink/45">QUOTE OF THE DAY</p><p className="mt-7 max-w-xl font-display text-lg font-medium leading-[1.35] tracking-[-.02em] text-ink/80 sm:text-2xl">“{quote.text}”</p><p className="mt-7 font-display text-[10px] font-bold tracking-[.12em] text-ink/40">{quote.source.toUpperCase()}</p></article>
    <aside className="border-l border-ink/15 pl-5 sm:pl-7"><div className="flex items-baseline justify-between"><p className="font-display text-[10px] font-bold tracking-[.18em] text-ink/50">{selectedDate.toLocaleString("en-US", { month: "short" }).toUpperCase()} {year}</p><span className="font-display text-[10px] text-ink/40">MONTH</span></div><div className="mt-4 grid grid-cols-7 gap-y-2 text-center font-display text-[10px] text-ink/55">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className="font-bold">{day}</span>)}{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const weekday = (firstWeekday + index) % 7; const isSelected = day === selectedDate.getDate(); return <span key={day} className={`relative mx-auto flex h-6 w-6 items-center justify-center ${isSelected ? "rounded-full bg-slate font-bold text-paper-deep" : ""}`} style={weekday > 4 && !isSelected ? { color: sundayColor } : undefined}>{day}</span>; })}</div></aside>
  </div>;
}

function BlockBar({ entry, lane, laneCount, compact = false }: { entry: BlockWithMember; lane: number; laneCount: number; compact?: boolean }) {
  const { block, member } = entry;
  const color = member.color;
  const left = compact ? "4%" : `calc(6px + ${lane} * (100% - 10px) / ${laneCount})`;
  const width = compact ? "92%" : `calc((100% - 10px) / ${laneCount} - 3px)`;
  return <Link href={`/people/${member.id}`} title={`${member.fullName}, ${formatTime(block.startTime)}–${formatTime(block.endTime)}`} className="absolute z-[1] overflow-hidden rounded-[2px] border-l-[3px] px-2 py-1.5 transition hover:z-10 hover:brightness-95" style={{ top: `${dayPosition(block.startTime)}%`, height: `${Math.max(((toMinutes(block.endTime) - toMinutes(block.startTime)) / daySpan) * 100, compact ? 5 : 3.8)}%`, left, width, backgroundColor: wash(color, .16), borderLeftColor: color }}><span className="block truncate font-display text-[11px] font-bold leading-tight">{member.fullName}</span><span className="mt-1 block truncate text-[10px] font-medium text-ink/60">{formatTime(block.startTime)}–{formatTime(block.endTime)}</span></Link>;
}

function DayTimeline({ entries, mobile = false, short = false, accent }: { entries: BlockWithMember[]; mobile?: boolean; short?: boolean; accent: string }) {
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
  const plannerGrid = `repeating-linear-gradient(to bottom, ${wash(accent, .36)} 0 1px, transparent 1px ${hourHeight * 2}px),repeating-linear-gradient(to bottom, ${wash(accent, .22)} 0 1px, transparent 1px ${hourHeight}px),repeating-linear-gradient(to bottom, ${wash(accent, .13)} 0 1px, transparent 1px ${hourHeight / 4}px),repeating-linear-gradient(to right, ${wash(accent, .13)} 0 1px, transparent 1px 26px)`;
  return <div className={short ? "relative h-[360px]" : mobile ? "relative h-[408px]" : "relative h-[672px]"} style={{ backgroundImage: plannerGrid }}>
    {entries.map((entry) => <BlockBar key={entry.block.id} entry={entry} lane={laneFor.get(entry.block.id) || 0} laneCount={maxLane} compact={mobile} />)}
  </div>;
}

function DayHero({ selectedDate, selectedDay, dateAccent, clock, selectedMonthYear, entries, openSessions, isToday, onToday }: { selectedDate: Date; selectedDay: number; dateAccent: string; clock: string; selectedMonthYear: string; entries: BlockWithMember[]; openSessions: SessionWithMember[]; isToday: boolean; onToday: () => void }) {
  return <div className="grid gap-8 px-5 pb-6 pt-8 sm:px-10 sm:pb-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
    <div className="flex min-h-[220px] min-w-0 flex-col justify-between border border-[#EAEAEA] bg-[#FFFDF9]"><div className="flex flex-1 items-center justify-center px-4 py-7"><div className="grid w-full max-w-[420px] grid-cols-[.9fr_1.6fr_1fr] border border-[#EAEAEA] font-display leading-none" style={{ color: dateAccent }}><div className="flex flex-col items-center justify-center border-r border-[#EAEAEA] px-2 py-4 sm:px-3"><span className="whitespace-nowrap text-[11px] font-bold tracking-[.12em]">{selectedDate.toLocaleString("en-US", { month: "short" }).toUpperCase()}</span><span className="mt-2 whitespace-nowrap text-xs font-medium tracking-[.12em]">{selectedDate.getFullYear()}</span></div><div className="flex min-w-0 items-center justify-center border-r border-[#EAEAEA] px-2 py-3 text-[5.75rem] font-extrabold tracking-[-.1em] sm:px-4 sm:text-[7rem]">{selectedDate.getDate()}</div><div className="flex flex-col items-center justify-center gap-2 px-2 py-4 text-ink/70 sm:px-4"><span className="whitespace-nowrap text-3xl font-extrabold sm:text-4xl">{["月", "火", "水", "木", "金", "土", "日"][selectedDay]}</span><span className="whitespace-nowrap text-sm font-extrabold tracking-[.16em] text-ink/65 sm:text-base">{WEEKDAYS[selectedDay].toUpperCase()}</span></div></div></div><div className="flex items-center justify-between px-4 py-3 font-display text-xs font-extrabold tabular-nums sm:px-6"><span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-coral" />{clock}<span className="text-[10px] font-medium tracking-[.14em] text-ink/50">LAB TIME</span></span><span className="whitespace-nowrap text-[10px] font-medium tracking-[.14em] text-ink/45">{selectedMonthYear}</span></div></div>
    <div className="w-max max-w-full self-center justify-self-start px-2 sm:px-5"><div className="mb-4 flex justify-end"><button type="button" onClick={onToday} disabled={isToday} className={`whitespace-nowrap border px-3 py-2 font-display text-[11px] font-bold tracking-[.08em] transition ${isToday ? "border-ink/10 text-ink/25" : "border-ink/20 text-ink/55 hover:border-ink/55 hover:text-ink"}`} aria-label="Return to today" aria-pressed={isToday}>Today</button></div><TodayList entries={entries} openSessions={openSessions} /></div>
  </div>;
}

function TodayList({ entries, openSessions }: { entries: BlockWithMember[]; openSessions: SessionWithMember[] }) {
  const scheduledIds = new Set(entries.map(({ member }) => member.id));
  const rows = [...entries.map(({ block, member }) => ({ member, start: block.startTime, end: block.endTime })), ...openSessions.filter(({ member }) => !scheduledIds.has(member.id)).map(({ session, member }) => ({ member, start: session.startTime, end: "Now" }))];
  return <div>
    {rows.length ? rows.map(({ member, start, end }) => <Link href={`/people/${member.id}`} key={member.id} className="flex w-max max-w-full min-h-11 items-center justify-start gap-3 py-1.5 transition hover:bg-ink/[.03]"><span className="flex min-w-0 items-center gap-2.5"><span className="h-7 w-1 rounded-[1px]" style={{ backgroundColor: member.color }} /><span className="truncate font-display text-sm font-bold">{member.fullName}</span></span><span className="shrink-0 whitespace-nowrap font-display text-[11px] tabular-nums text-ink/55">{formatTime(start)}–{end === "Now" ? "now" : formatTime(end)}</span></Link>) : <p className="border-l-2 border-coral pl-3 text-sm leading-6 text-ink/70">Nobody has hours today.</p>}
  </div>;
}

function PeoplePalette({ people }: { people: PublicPerson[] }) {
  return <section className="px-5 pb-10 pt-2 sm:px-10"><p className="font-display text-[10px] font-bold tracking-[.18em] text-ink/45">PEOPLE</p><div className="mt-4 flex flex-wrap gap-x-7 gap-y-3">{people.map((member) => <Link href={`/people/${member.id}`} key={member.id} className="flex items-center gap-2.5 font-display text-sm font-bold transition hover:text-ink/60"><span className="h-7 w-1 rounded-[1px]" style={{ backgroundColor: member.color }} />{member.fullName}</Link>)}</div></section>;
}

function WeekDateBox({ day, date, selected, accent, onClick }: { day: string; date: Date; selected: boolean; accent: string; onClick: () => void }) {
  const dateColor = day === "Sun" ? sundayColor : accent;
  return <button onClick={onClick} className="min-w-0 text-left" aria-label={`Select ${day} ${date.getDate()}`}><div className="mx-1 my-2 flex min-h-[94px] flex-col items-center justify-center border bg-[#FFFDF9] px-2 py-2 transition" style={{ borderColor: selected ? dateColor : "#EAEAEA", backgroundColor: selected ? wash(dateColor, .09) : "#FFFDF9", color: selected ? dateColor : undefined }}><span className="font-display text-[10px] font-extrabold tracking-[.14em]">{day.toUpperCase()}</span><span className="mt-1 font-display text-4xl font-extrabold leading-none tracking-[-.08em]">{date.getDate()}</span><span className="mt-2 font-display text-[10px] font-bold tracking-[.12em] text-ink/45">{date.toLocaleString("en-US", { month: "short" }).toUpperCase()}</span></div></button>;
}

export function PublicBoard({ today, now, people, blocks, openSessions }: { today: string; now: string; people: PublicPerson[]; blocks: BlockWithMember[]; openSessions: SessionWithMember[] }) {
  const [selectedDateValue, setSelectedDateValue] = useState(today);
  const [clock, setClock] = useState(now);
  useEffect(() => {
    const tick = () => setClock(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const byDay = useMemo(() => WEEKDAYS.map((_, index) => blocks.filter(({ block }) => block.weekday === index + 1)), [blocks]);
  const selectedDate = new Date(`${selectedDateValue}T12:00:00`);
  const selectedDay = (selectedDate.getDay() + 6) % 7;
  const selectedWeekMonday = getMonday(selectedDateValue);
  const currentEntries = byDay[selectedDay];
  const dateForDay = (index: number) => new Date(`${selectedWeekMonday}T12:00:00`).setDate(new Date(`${selectedWeekMonday}T12:00:00`).getDate() + index);
  const shiftSelectedDate = (days: number) => setSelectedDateValue((value) => addDays(value, days));
  const dateLabel = (index: number) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dateForDay(index)));
  const fullDate = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(selectedDate).toUpperCase();
  const totalHours = blocks.reduce((sum, { block }) => sum + (toMinutes(block.endTime) - toMinutes(block.startTime)) / 60, 0);
  const selectedMonthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(selectedDate).toUpperCase();
  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedDayNumber = selectedDate.getDate();
  const selectedKanji = ["月", "火", "水", "木", "金", "土", "日"][selectedDay];
  const monthAccent = hues[selectedDate.getMonth()];
  const dateAccent = selectedDay === 6 ? sundayColor : monthAccent;
  const dateValueForDay = (index: number) => new Date(dateForDay(index)).toISOString().slice(0, 10);
  return <div className="min-h-screen px-4 pb-20 sm:px-8" style={{ backgroundColor: wash(monthAccent, .12) }}>
    <section className="mx-auto max-w-[1280px] overflow-hidden border-x border-ink/20 bg-[#FFFDF9] shadow-[0_16px_50px_rgba(43,41,38,.08)]">
      <div className="flex items-center justify-between gap-4 bg-paper-deep px-5 py-4 sm:px-10">
        <Link href="/" aria-label="RABO home" className="flex items-end gap-3"><span className="font-display text-2xl font-extrabold tracking-[-.06em]">RABO</span><span className="text-sm font-extrabold tracking-[.16em]" style={{ color: monthAccent }}>ランラボ</span></Link>
        <a href="https://yangran.org/" target="_blank" rel="noreferrer" className="border border-ink/25 px-3 py-2 font-display text-[11px] font-bold tracking-[.08em] text-ink/60 transition hover:border-ink/60 hover:text-ink">yangran.org ↗</a>
      </div>
      <div className="px-5 py-1.5 sm:px-10" style={{ backgroundColor: monthAccent }} />
      <DayHero selectedDate={selectedDate} selectedDay={selectedDay} dateAccent={dateAccent} clock={clock} selectedMonthYear={selectedMonthYear} entries={currentEntries} openSessions={selectedDateValue === today ? openSessions : []} isToday={selectedDateValue === today} onToday={() => setSelectedDateValue(today)} />
      <div className="relative px-5 pb-8 sm:px-6">
        <button aria-label="Previous day" onClick={() => shiftSelectedDate(-1)} className="absolute left-0 top-1/2 z-10 flex h-8 w-6 -translate-y-1/2 items-center justify-center border border-ink/20 bg-[#FFFDF9] text-ink/35 transition hover:border-ink/50 hover:text-ink"><ChevronLeft size={14} /></button><button aria-label="Next day" onClick={() => shiftSelectedDate(1)} className="absolute right-0 top-1/2 z-10 flex h-8 w-6 -translate-y-1/2 items-center justify-center border border-ink/20 bg-[#FFFDF9] text-ink/35 transition hover:border-ink/50 hover:text-ink"><ChevronRight size={14} /></button>
        <div className="mx-auto grid w-full grid-cols-[52px_16px_minmax(0,1fr)] sm:grid-cols-[82px_22px_minmax(0,1fr)]"><HourAxis /><DensityBand entries={currentEntries} color={monthAccent} /><div className="min-w-0"><DayTimeline entries={currentEntries} accent={monthAccent} /></div></div>
      </div>
      <DayExtras selectedDate={selectedDate} selectedDay={selectedDay} blocks={blocks} />
      <section className="px-5 pb-10 pt-8 sm:px-10 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="font-display text-[11px] font-bold tracking-[.18em] text-ink/55">THE WEEK</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-[-.03em]">{dateLabel(0)}–{dateLabel(4)} {fullDate}</h2></div><div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-ink/55"><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-ink bg-ink/10" /> booked</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-coral bg-coral/15" /> in now</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[2px] border-dashed border-ink bg-ink/10" /> one-off</span></div></div>
        <div className="hidden overflow-hidden lg:block"><div className="grid grid-cols-[52px_repeat(5,minmax(0,1fr))] divide-x divide-ink/15"><div className="flex items-center px-2 py-3 font-display text-[10px] font-bold tracking-[.18em] text-ink/55">TIME</div>{WEEKDAYS.slice(0, 5).map((day, index) => <WeekDateBox key={day} day={day} date={new Date(dateForDay(index))} selected={selectedDay === index} accent={monthAccent} onClick={() => setSelectedDateValue(dateValueForDay(index))} />)}<div><HourAxis short /></div>{WEEKDAYS.slice(0, 5).map((day, index) => <button onClick={() => setSelectedDateValue(dateValueForDay(index))} key={`timeline-${day}`} className={`relative min-w-0 px-1.5 text-left ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><DayTimeline entries={byDay[index]} accent={monthAccent} short /></button>)}</div></div>
        <div className="space-y-2 lg:hidden">{WEEKDAYS.slice(0, 5).map((day, index) => <div key={day} className={`flex w-full items-stretch gap-2 ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><WeekDateBox day={day} date={new Date(dateForDay(index))} selected={selectedDay === index} accent={monthAccent} onClick={() => setSelectedDateValue(dateValueForDay(index))} /><button onClick={() => setSelectedDateValue(dateValueForDay(index))} className="relative min-w-0 flex-1 px-1 text-left"><span className="relative block h-full min-h-12"><span className="absolute inset-y-0 left-0 right-0 flex items-end gap-px">{Array.from({ length: 48 }, (_, slot) => { const start = 7 * 60 + slot * 15; const count = byDay[index].filter(({ block }) => toMinutes(block.startTime) <= start && toMinutes(block.endTime) > start).length; return <i key={slot} className="flex-1 bg-slate" style={{ height: `${count ? Math.max(15, count * 24) : 0}%`, opacity: count ? .78 : 0 }} />; })}</span></span></button></div>)}</div>
        <PeoplePalette people={people} />
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 bg-paper-deep px-5 py-4 font-display text-[10px] font-medium tracking-[.14em] text-ink/50 sm:px-10"><span>RABO.YANGRAN.ORG · © Yang Ran 2026</span><span className="flex flex-wrap items-center justify-end gap-4"><span>07:00–19:00 · AMERICA/NEW_YORK · {totalHours.toFixed(1)} H SCHEDULED</span><Link href="/admin" className="font-medium tracking-[.08em] text-ink/35 transition hover:text-coral">管理者ログイン</Link></span></footer>
    </section>
  </div>;
}
