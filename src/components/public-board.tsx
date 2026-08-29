"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import type { Person, WeeklyBlock } from "@/db/schema";
import { formatTime, LONG_WEEKDAYS, toMinutes, WEEKDAYS } from "@/lib/utils";

type BlockWithMember = { block: WeeklyBlock; member: Person };
type SessionWithMember = { session: { personId: number; startTime: string; endTime: string | null }; member: Person };

const hues = ["#EE7E61", "#A47351", "#D590B6", "#F28D9D", "#B5A131", "#459379", "#2095A6", "#5F70B3", "#A26A5F", "#668144", "#91517D", "#AB3A46", "#4F6E8F", "#7D7A86", "#D9A05B"];
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

function DayTimeline({ entries, now, showNow = true, mobile = false, short = false }: { entries: BlockWithMember[]; now: string; showNow?: boolean; mobile?: boolean; short?: boolean }) {
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
  return <div className={short ? "relative h-[360px]" : mobile ? "relative h-[408px]" : "relative h-[672px]"}>
    {Array.from({ length: 13 }, (_, i) => <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-ink/10" style={{ top: `${(i / 12) * 100}%` }} />)}
    {entries.map((entry) => <BlockBar key={entry.block.id} entry={entry} lane={laneFor.get(entry.block.id) || 0} laneCount={maxLane} compact={mobile} />)}
    {showNow && <div className="absolute inset-y-0 z-[2] w-0.5 bg-coral" style={{ left: `${dayPosition(now)}%` }}><span className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full border-2 border-paper-deep bg-coral" /></div>}
  </div>;
}

function TodayList({ entries, openSessions, now, todayIndex, actualTodayIndex }: { entries: BlockWithMember[]; openSessions: SessionWithMember[]; now: string; todayIndex: number; actualTodayIndex: number }) {
  const minute = toMinutes(now);
  const current = new Map<number, { member: Person; start: string; end: string }>();
  openSessions.forEach(({ session, member }) => current.set(member.id, { member, start: session.startTime, end: "Now" }));
  entries.filter(({ block }) => toMinutes(block.startTime) <= minute && toMinutes(block.endTime) > minute).forEach(({ block, member }) => current.set(member.id, { member, start: block.startTime, end: block.endTime }));
  const rows = todayIndex === actualTodayIndex ? Array.from(current.values()) : entries.map(({ block, member }) => ({ member, start: block.startTime, end: block.endTime }));
  return <div>
    <p className="font-display text-[11px] font-bold tracking-[.18em] text-ink/55">TODAY IN THE ROOM</p>
    {rows.length ? rows.map(({ member, start, end }) => <Link href={`/people/${member.id}`} key={member.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-ink/10 py-1.5 transition hover:bg-ink/[.03]"><span className="flex min-w-0 items-center gap-2.5"><PersonChip color={hues[(member.id - 1) % hues.length]} size="sm" /><span className="truncate font-display text-sm font-bold">{member.fullName}</span></span><span className="shrink-0 font-display text-[11px] tabular-nums text-ink/55">{formatTime(start)}–{end === "Now" ? "now" : formatTime(end)}</span></Link>) : <p className="mt-4 border-l-2 border-coral pl-3 text-sm leading-6 text-ink/70">Nobody has hours today. The room is free all day.</p>}
    <p className="mt-5 text-xs leading-5 text-ink/55">The vermilion line is the current time. Bars crossing it show who is in the room.</p>
    <p className="mt-3 flex items-center gap-2 text-[11px] font-medium text-ink/45"><Radio size={13} className="text-coral" /> Lab time · America/New_York</p>
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
  const weekdayName = LONG_WEEKDAYS[selectedDay];
  return <div className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-8">
    <section className="mx-auto max-w-[1280px] overflow-hidden border-x border-b border-ink/20 bg-paper-deep shadow-[0_16px_50px_rgba(43,41,38,.08)]">
      <div className="flex items-center justify-between gap-4 border-b border-ink/20 bg-paper-deep px-5 py-4 sm:px-10">
        <Link href="/" aria-label="RABO home" className="flex items-end gap-3"><span className="font-display text-2xl font-extrabold tracking-[-.06em]">RABO</span><span className="text-sm font-medium tracking-[.16em] text-ink/55">ランラボ</span></Link>
        <span className="flex items-center gap-2 font-display text-sm font-extrabold tabular-nums"><span className="h-2 w-2 animate-pulse rounded-full bg-coral" />{clock}<span className="hidden text-[10px] font-medium tracking-[.14em] text-ink/55 sm:inline">LAB TIME</span></span>
      </div>
      <div className="border-b border-ink/10 px-5 py-1.5 sm:px-10" style={{ backgroundColor: hues[(new Date(`${today}T12:00:00`).getMonth()) % hues.length] }} />
      <div className="flex flex-wrap items-end justify-between gap-5 px-5 pb-5 pt-8 sm:px-10 sm:pb-6 sm:pt-10">
        <div className="flex items-end gap-4 sm:gap-6"><span className="font-display text-7xl font-extrabold leading-[.75] tracking-[-.08em] text-slate sm:text-8xl">{new Date(dateForDay(selectedDay)).getDate()}</span><span className="pb-1"><span className="block font-display text-3xl font-extrabold leading-none tracking-[-.04em]">{weekdayName}</span><span className="mt-1 block font-display text-sm font-medium tracking-[.16em] text-ink/55">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(dateForDay(selectedDay))).toUpperCase()}</span></span><span className="hidden pb-1 font-display text-3xl font-medium text-ink/25 sm:block">今日</span></div>
        <div className="flex gap-2"><button onClick={() => setSelectedDay((selectedDay + 6) % 7)} className="flex min-h-11 items-center gap-2 border border-ink/35 px-3 font-display text-xs font-bold tracking-[.04em] transition hover:bg-ink/5"><ChevronLeft size={15} />{WEEKDAYS[(selectedDay + 6) % 7]}</button><button onClick={() => setSelectedDay((selectedDay + 1) % 7)} className="flex min-h-11 items-center gap-2 border border-ink/35 px-3 font-display text-xs font-bold tracking-[.04em] transition hover:bg-ink/5">{WEEKDAYS[(selectedDay + 1) % 7]}<ChevronRight size={15} /></button></div>
      </div>
      <div className="grid gap-8 border-b-2 border-ink/20 px-5 pb-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        <div className="grid grid-cols-[52px_16px_minmax(0,1fr)] border-t-2 border-ink/20 sm:grid-cols-[82px_22px_minmax(0,1fr)]"><HourAxis /><DensityBand entries={currentEntries} /><div className="min-w-0"><DayTimeline entries={currentEntries} now={clock} /></div></div>
        <TodayList entries={currentEntries} openSessions={openSessions} now={clock} todayIndex={selectedDay} actualTodayIndex={todayWeekday} />
      </div>
      <section className="px-5 pb-10 pt-8 sm:px-10 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="font-display text-[11px] font-bold tracking-[.18em] text-ink/55">THE WEEK</p><h2 className="mt-1 font-display text-2xl font-extrabold tracking-[-.03em]">{dateLabel(0)}–{dateLabel(4)} {fullDate}</h2></div><div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-ink/55"><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-ink bg-ink/10" /> booked</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-coral bg-coral/15" /> in now</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[2px] border-dashed border-ink bg-ink/10" /> one-off</span></div></div>
        <div className="hidden overflow-hidden border-t-2 border-ink/20 lg:block"><div className="grid grid-cols-[52px_repeat(5,minmax(0,1fr))] divide-x divide-ink/15"><div className="border-b border-ink/15 px-2 py-3 font-display text-[10px] font-bold tracking-[.18em] text-ink/55">TIME</div>{WEEKDAYS.slice(0, 5).map((day, index) => <button onClick={() => setSelectedDay(index)} key={day} className={`text-left ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><div className={`border-b border-ink/15 px-3 py-3 ${selectedDay === index ? "text-coral" : ""}`}><span className="font-display text-sm font-extrabold tracking-[.12em]">{day.toUpperCase()}</span><span className="ml-2 font-display text-xs text-ink/50">{dateLabel(index)}</span></div></button>)}<div><HourAxis short /></div>{WEEKDAYS.slice(0, 5).map((day, index) => <button onClick={() => setSelectedDay(index)} key={`timeline-${day}`} className={`relative min-w-0 px-1.5 text-left ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><DayTimeline entries={byDay[index]} now={clock} showNow={selectedDay === index} short /></button>)}</div></div>
        <div className="space-y-0 border-t-2 border-ink/20 lg:hidden">{WEEKDAYS.slice(0, 5).map((day, index) => <button onClick={() => setSelectedDay(index)} key={day} className={`flex w-full items-center gap-3 border-b border-ink/15 px-1 py-3 text-left ${selectedDay === index ? "bg-coral/[.06]" : ""}`}><span className="w-14 font-display text-xs font-extrabold tracking-[.1em]">{day.toUpperCase()}<small className="mt-0.5 block font-medium tracking-normal text-ink/55">{dateLabel(index)}</small></span><span className="relative h-12 flex-1 border-b border-ink/25"><span className="absolute inset-y-0 left-0 right-0 flex items-end gap-px">{Array.from({ length: 48 }, (_, slot) => { const start = 7 * 60 + slot * 15; const count = byDay[index].filter(({ block }) => toMinutes(block.startTime) <= start && toMinutes(block.endTime) > start).length; return <i key={slot} className="flex-1 bg-slate" style={{ height: `${count ? Math.max(15, count * 24) : 0}%`, opacity: count ? .78 : 0 }} />; })}</span>{selectedDay === index && <span className="absolute inset-y-[-3px] w-0.5 bg-coral" style={{ left: `${dayPosition(clock)}%` }} />}</span></button>)}</div>
        <p className="mb-3 mt-8 border-t-2 border-ink/20 pt-4 font-display text-[11px] font-bold tracking-[.18em] text-ink/55">WHO IS WHICH COLOUR</p><div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-4">{people.map((member) => <Link href={`/people/${member.id}`} key={member.id} className="flex min-w-0 items-center gap-2.5 border-b border-ink/10 py-2 transition hover:text-coral"><PersonChip color={hues[(member.id - 1) % hues.length]} size="sm" /><span className="truncate font-display text-[13px] font-bold">{member.fullName}</span></Link>)}</div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/20 bg-paper-deep px-5 py-4 font-display text-[10px] font-medium tracking-[.14em] text-ink/50 sm:px-10"><span>RABO.YANGRAN.ORG</span><span className="flex items-center gap-4"><span>07:00–19:00 · AMERICA/NEW_YORK · {totalHours.toFixed(1)} H SCHEDULED</span><Link href="/admin" className="font-bold text-slate transition hover:text-coral">ADMIN</Link></span></footer>
    </section>
  </div>;
}
