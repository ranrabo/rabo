"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, GripVertical, Pencil, Trash2, X } from "lucide-react";
import type { PublicPerson, WeeklyBlock } from "@/db/schema";
import { addDays, firstName, formatHours, formatTime, getMonday, toMinutes, WEEKDAYS } from "@/lib/utils";
import { isTermOver, labStatusFor } from "@/lib/term";
import { quoteForDate } from "@/lib/quotes";
import { addScheduleBlock, clearAttendance, confirmAttendance, createWeeklyBlock, deleteWeeklyBlock, reorderPeople, saveAdminNote, updateWeeklyBlock } from "@/app/admin/actions";

type BlockWithMember = { block: WeeklyBlock; member: PublicPerson };
type SessionWithMember = { session: { personId: number; startTime: string; endTime: string | null }; member: PublicPerson };

type Pos = { weekday: number; start: number; end: number };
type Edit = Pos & { personId: number };
type DragState = { id: number; mode: "move" | "top" | "bottom"; crossDay: boolean; startX: number; startY: number; mpp: number; startPos: Pos; personId: number; moved: boolean };
type BarEditApi = {
  crossDay: boolean;
  isDirty: (id: number) => boolean;
  isSaving: (id: number) => boolean;
  isConfirmed: (id: number) => boolean;
  isAttendOpen: (id: number) => boolean;
  onDraw: (weekday: number, start: number, end: number) => void;
  onBarPointerDown: (event: React.PointerEvent, id: number) => void;
  onEdgePointerDown: (event: React.PointerEvent, id: number, edge: "top" | "bottom") => void;
  onDragMove: (event: React.PointerEvent) => void;
  onDragEnd: (event: React.PointerEvent) => void;
  onCommit: (id: number) => void;
  onRevert: (id: number) => void;
  onToggleConfirm: (id: number) => void;
  onDismissAttend: () => void;
  onOpenEditor: (id: number) => void;
};

const hues = ["#EE7E61", "#A47351", "#D590B6", "#F28D9D", "#B5A131", "#459379", "#2095A6", "#5F70B3", "#A26A5F", "#668144", "#91517D", "#AB3A46", "#4F6E8F", "#7D7A86", "#D9A05B"];
const sundayColor = "#E0525A";
const dayStart = 7 * 60;
const dayEnd = 19 * 60;
const daySpan = dayEnd - dayStart;

const SLOT = 15;
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const snapMin = (minutes: number) => Math.round(minutes / SLOT) * SLOT;
const clampMin = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const clampRange = (first: number, second: number) => {
  let start = Math.min(first, second);
  let end = Math.max(first, second);
  if (end - start < SLOT) {
    end = Math.min(dayEnd, start + SLOT);
    if (end - start < SLOT) start = dayEnd - SLOT;
  }
  return { start, end };
};
const moonPhases = [
  { name: "New Moon", symbol: "🌑" },
  { name: "Waxing Crescent", symbol: "🌒" },
  { name: "First Quarter", symbol: "🌓" },
  { name: "Waxing Gibbous", symbol: "🌔" },
  { name: "Full Moon", symbol: "🌕" },
  { name: "Waning Gibbous", symbol: "🌖" },
  { name: "Last Quarter", symbol: "🌗" },
  { name: "Waning Crescent", symbol: "🌘" },
];

const getMoonPhase = (date: Date) => {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const age = ((date.getTime() - knownNewMoon) / 86_400_000) % synodicMonth;
  const normalizedAge = age < 0 ? age + synodicMonth : age;
  const phaseIndex = Math.round((normalizedAge / synodicMonth) * 8) % 8;
  return moonPhases[phaseIndex];
};

const wash = (hex: string, alpha: number) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};

const brighten = (hex: string, amount = .32) => {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) + (255 - ((n >> shift) & 255)) * amount).toString(16).padStart(2, "0");
  return `#${channel(16)}${channel(8)}${channel(0)}`;
};

const darken = (hex: string, amount = .16) => {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, "0");
  return `#${channel(16)}${channel(8)}${channel(0)}`;
};

const dayPosition = (value: string) => ((toMinutes(value) - dayStart) / daySpan) * 100;
const timeLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
// A person's name reads quiet and grey until their row/bar is highlighted, then
// it snaps to bold near-black. Shared by the timeline bars, the hero list and
// the people palette so the highlight cue is consistent everywhere.
const nameTone = (active: boolean) => `transition ${active ? "font-bold text-ink" : "font-normal text-ink/45"}`;

// Stack overlapping blocks into lanes (same rule the day timeline uses) so the
// compact mobile week rows can show every block without them piling up.
const layoutLanes = (entries: BlockWithMember[]) => {
  const lanes: BlockWithMember[][] = [];
  const laneFor = new Map<number, number>();
  [...entries].sort((a, b) => toMinutes(a.block.startTime) - toMinutes(b.block.startTime)).forEach((entry) => {
    let lane = 0;
    while (lanes[lane]?.some((other) => toMinutes(other.block.endTime) > toMinutes(entry.block.startTime))) lane += 1;
    (lanes[lane] ??= []).push(entry);
    laneFor.set(entry.block.id, lane);
  });
  return { laneFor, laneCount: Math.max(lanes.length, 1) };
};

const WMO = (code: number): { label: string; icon: string } => {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code <= 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if (code <= 48) return { label: "Fog", icon: "🌫️" };
  if (code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code <= 77) return { label: "Snow", icon: "🌨️" };
  if (code <= 82) return { label: "Showers", icon: "🌧️" };
  if (code <= 86) return { label: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "—", icon: "🌡️" };
};

// Live Williamsburg, VA conditions in the footer. Open-Meteo needs no key and
// sends permissive CORS, so this is a plain client fetch with a quiet fallback.
function FooterWeather() {
  const [weather, setWeather] = useState<{ tempF: number; label: string; icon: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://api.open-meteo.com/v1/forecast?latitude=37.2707&longitude=-76.7075&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York", { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => {
        const temp = data?.current?.temperature_2m;
        const code = data?.current?.weather_code;
        if (typeof temp === "number") setWeather({ tempF: Math.round(temp), ...WMO(Number(code) || 0) });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return <span className="whitespace-nowrap">{weather ? `${weather.icon} WILLIAMSBURG, VA · ${weather.tempF}°F ${weather.label.toUpperCase()}` : "WILLIAMSBURG, VA"}</span>;
}

function HourAxis({ short = false, accent }: { short?: boolean; accent: string }) {
  return <div className={`relative ${short ? "weekly-grid-height" : "day-grid-height"}`} aria-hidden="true">{Array.from({ length: 13 }, (_, i) => <span key={i} className="absolute right-3 -translate-y-1/2 font-display text-[10px] font-medium tabular-nums" style={{ top: `${(i / 12) * 100}%`, color: wash(accent, .8) }}>{i === 0 || i % 2 === 0 ? "–" : timeLabel(7 + i)}</span>)}</div>;
}

function DensityBand({ entries, short = false, color }: { entries: BlockWithMember[]; short?: boolean; color: string }) {
  return <div className={`relative border-l ${short ? "weekly-grid-height" : "day-grid-height"}`} style={{ borderLeftColor: wash(color, .55) }} aria-label="room occupancy density">{Array.from({ length: 48 }, (_, i) => { const start = dayStart + i * 15; const count = entries.filter(({ block }) => toMinutes(block.startTime) <= start && toMinutes(block.endTime) > start).length; return <span key={i} className="absolute left-0 w-full" style={{ top: `${(i / 48) * 100}%`, height: `${Math.max(0, 100 / 48 - .5)}%`, transform: `scaleX(${count ? Math.min(1, .18 + count / 8) : 0})`, transformOrigin: "left", backgroundColor: wash(color, .55) }} />; })}</div>;
}

function DayExtras({ selectedDate, selectedDay, blocks, today, accent, onSelectDate }: { selectedDate: Date; selectedDay: number; blocks: BlockWithMember[]; today: string; accent: string; onSelectDate: (date: Date) => void }) {
  const quote = quoteForDate(selectedDate);
  const [calendarMonth, setCalendarMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  useEffect(() => setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)), [selectedDate]);
  const shiftMonth = (amount: number) => setCalendarMonth(new Date(year, month + amount, 1));
  return <div className="grid gap-6 px-5 py-8 sm:w-[90%] sm:px-6 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-12">
    <article className="py-6 sm:ml-[104px]"><p className="max-w-2xl font-quote text-[13px] font-normal leading-[1.75] sm:text-[15px]" style={{ color: accent }}>“{quote.text}”</p><p className="mt-4 font-display text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: wash(accent, .7) }}>— {quote.source}</p></article>
    <aside className="border-l border-ink/15 pl-5 sm:pl-7"><div className="flex items-center justify-between"><p className="font-display text-[10px] font-bold tracking-[.18em]" style={{ color: accent }}>{calendarMonth.toLocaleString("en-US", { month: "short" }).toUpperCase()} {year}</p><div className="flex items-center gap-1"><button type="button" onClick={() => shiftMonth(-1)} className="px-1 text-sm leading-none text-ink/35 transition hover:text-ink" aria-label="Previous month">‹</button><button type="button" onClick={() => shiftMonth(1)} className="px-1 text-sm leading-none text-ink/35 transition hover:text-ink" aria-label="Next month">›</button></div></div><div className="mt-4 grid grid-cols-7 gap-y-2 text-center font-display text-[10px]" style={{ color: accent }}>{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`} className={index > 4 ? "font-normal" : "font-bold"}>{day}</span>)}{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const weekday = (firstWeekday + index) % 7; const isSelected = year === selectedDate.getFullYear() && month === selectedDate.getMonth() && day === selectedDate.getDate(); const isToday = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` === today; return <button type="button" key={day} onClick={() => onSelectDate(new Date(year, month, day, 12))} className={`relative mx-auto flex h-6 w-6 items-center justify-center transition hover:bg-slate/15 ${isSelected ? "rounded-full bg-slate font-bold text-paper-deep" : isToday ? "border border-slate font-bold text-slate" : ""}`} style={weekday > 4 && !isSelected && !isToday ? { color: sundayColor } : undefined} aria-label={`Select ${calendarMonth.toLocaleString("en-US", { month: "long" })} ${day}`}>{day}</button>; })}</div></aside>
  </div>;
}

function BlockBar({ entry, lane, laneCount, compact = false, vertical = false, highlighted, onToggle, edit }: { entry: BlockWithMember; lane: number; laneCount: number; compact?: boolean; vertical?: boolean; highlighted: boolean; onToggle: (personId: number) => void; edit?: BarEditApi }) {
  const { block, member } = entry;
  const color = member.color;
  // Resting bars sit light and translucent; a highlighted (clicked) bar goes
  // darker and more opaque so it pops out of the grid.
  const restFill = wash(color, .1);
  const restStroke = wash(color, .5);
  const highlightFill = wash(darken(color, .08), .44);
  const highlightStroke = darken(color, .14);
  const left = compact ? "4%" : `calc(6px + ${lane} * (100% - 10px) / ${laneCount})`;
  const width = compact ? "92%" : `calc((100% - 10px) / ${laneCount} - 3px)`;
  const top = `${dayPosition(block.startTime)}%`;
  const height = `${Math.max(((toMinutes(block.endTime) - toMinutes(block.startTime)) / daySpan) * 100, compact ? 5 : 3.8)}%`;
  const label = `${firstName(member.fullName)}, ${formatTime(block.startTime)}–${formatTime(block.endTime)}`;

  if (edit) {
    const dirty = edit.isDirty(block.id);
    const saving = edit.isSaving(block.id);
    const confirmed = !dirty && block.id > 0 && edit.isConfirmed(block.id);
    const attendOpen = !dirty && block.id > 0 && edit.isAttendOpen(block.id);
    const showAttend = confirmed || attendOpen;
    const clusterPos = vertical ? "right-0.5 top-0.5 flex-col" : "left-full top-0 ml-1";
    return <div data-block-id={block.id} className={`group absolute ${dirty || showAttend ? "z-20" : "z-[1]"}`} style={{ top, height, left, width }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}. Drag to move, drag the lower edge to resize, click to confirm attendance.`}
        title={`${label} — drag to move, lower edge to resize, click to confirm attendance`}
        onPointerDown={(event) => edit.onBarPointerDown(event, block.id)}
        onPointerMove={edit.onDragMove}
        onPointerUp={edit.onDragEnd}
        className="absolute inset-0 touch-none cursor-grab select-none overflow-hidden rounded-[2px] border-l-[3px] px-2 py-1.5 text-left shadow-sm transition active:cursor-grabbing"
        style={{
          backgroundColor: dirty ? wash(color, .3) : confirmed ? wash(color, .4) : highlighted ? highlightFill : restFill,
          borderLeftColor: dirty || confirmed ? color : highlighted ? highlightStroke : restStroke,
          boxShadow: dirty ? `0 0 0 1px ${color}` : confirmed ? `inset 0 0 0 1px ${wash(color, .5)}` : highlighted ? `0 0 0 1px ${highlightStroke}` : undefined,
        }}
      >
        <span className={`pointer-events-none block truncate font-display text-[11px] leading-tight ${nameTone(highlighted || dirty || confirmed)} ${vertical ? "writing-mode-vertical [writing-mode:vertical-rl]" : "[writing-mode:vertical-rl] sm:[writing-mode:horizontal-tb]"}`}>{firstName(member.fullName)}</span>
        {vertical ? null : <span className="pointer-events-none mt-1 hidden truncate text-[10px] font-medium text-ink/60 sm:block">{formatTime(block.startTime)}–{formatTime(block.endTime)}</span>}
        <span onPointerDown={(event) => edit.onEdgePointerDown(event, block.id, "bottom")} onPointerMove={edit.onDragMove} onPointerUp={edit.onDragEnd} className="absolute inset-x-0 bottom-0 z-[3] h-2 cursor-ns-resize touch-none" aria-hidden="true" />
      </div>
      {!dirty && block.id > 0 ? <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); edit.onOpenEditor(block.id); }} aria-label="Edit block (person or remove)" title="Edit block — person, remove" className={`absolute z-30 flex h-4 w-4 items-center justify-center rounded-full bg-paper-deep text-ink/40 opacity-0 shadow-sm transition hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 ${vertical ? "bottom-0.5 right-0.5" : "right-0.5 top-0.5"}`}><Pencil size={9} strokeWidth={2.5} /></button> : null}
      {dirty ? <div className={`absolute z-30 flex gap-1 ${clusterPos}`}>
        <button type="button" disabled={saving} onPointerDown={(event) => event.stopPropagation()} onClick={() => edit.onCommit(block.id)} aria-label="Save this change" title="Save this change" className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-slate/40 bg-paper-deep text-slate shadow-sm transition hover:bg-slate hover:text-paper-deep disabled:opacity-50"><Check size={11} strokeWidth={3} /></button>
        <button type="button" disabled={saving} onPointerDown={(event) => event.stopPropagation()} onClick={() => edit.onRevert(block.id)} aria-label="Discard this change" title="Discard this change" className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-ink/25 bg-paper-deep text-ink/50 shadow-sm transition hover:bg-ink/10 hover:text-ink disabled:opacity-50"><X size={11} strokeWidth={3} /></button>
      </div> : showAttend ? <div className={`absolute z-30 flex gap-1 ${clusterPos}`}>
        <button type="button" disabled={saving} onPointerDown={(event) => event.stopPropagation()} onClick={() => edit.onToggleConfirm(block.id)} aria-pressed={confirmed} aria-label={confirmed ? "Attendance confirmed — click to undo" : "Confirm full attendance"} title={confirmed ? "Attendance confirmed — click to undo" : "Confirm full attendance"} className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border shadow-sm transition disabled:opacity-50 ${confirmed ? "border-slate bg-slate text-paper-deep hover:bg-ink hover:border-ink" : "border-slate/40 bg-paper-deep text-slate hover:bg-slate hover:text-paper-deep"}`}><Check size={11} strokeWidth={3} /></button>
        {attendOpen ? <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => edit.onDismissAttend()} aria-label="Dismiss" title="Dismiss" className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-ink/25 bg-paper-deep text-ink/50 shadow-sm transition hover:bg-ink/10 hover:text-ink"><X size={11} strokeWidth={3} /></button> : null}
      </div> : null}
    </div>;
  }

  return <button type="button" onClick={() => onToggle(member.id)} aria-pressed={highlighted} aria-label={`Highlight ${firstName(member.fullName)}`} title={label} className="absolute z-[1] overflow-hidden rounded-[2px] border-l-[3px] px-2 py-1.5 text-left transition hover:z-10 hover:brightness-95" style={{ top, height, left, width, backgroundColor: highlighted ? highlightFill : restFill, borderLeftColor: highlighted ? highlightStroke : restStroke, boxShadow: highlighted ? `0 0 0 1px ${highlightStroke}` : undefined }}><span className={`block truncate font-display text-[11px] leading-tight ${nameTone(highlighted)} ${vertical ? "writing-mode-vertical [writing-mode:vertical-rl]" : "[writing-mode:vertical-rl] sm:[writing-mode:horizontal-tb]"}`}>{firstName(member.fullName)}</span>{vertical ? null : <span className="mt-1 hidden truncate text-[10px] font-medium text-ink/60 sm:block">{formatTime(block.startTime)}–{formatTime(block.endTime)}</span>}</button>;
}

function DayTimeline({ entries, mobile = false, short = false, accent, currentTime, highlightedPeople, onToggle, edit, weekday }: { entries: BlockWithMember[]; mobile?: boolean; short?: boolean; accent: string; currentTime?: string; highlightedPeople: Set<number>; onToggle: (personId: number) => void; edit?: BarEditApi; weekday?: number }) {
  const [draw, setDraw] = useState<{ start: number; end: number } | null>(null);
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
  // Horizontal rules are sized as fractions of the timeline height (12 hours,
  // 07:00–19:00) so they line up with the HourAxis labels and the block bars,
  // which are all positioned by percentage. The weekly and day grids share the
  // exact same planner ruling — day and week timeline heights are both multiples
  // of 48 so calc(100% / 48) lands on whole pixels and the rules stay aligned
  // with the hour ticks instead of drifting.
  const columnRule = mobile ? 22 : 26;
  const verticalRule = `,repeating-linear-gradient(to right, ${wash(accent, .13)} 0 1px, transparent 1px ${columnRule}px)`;
  const plannerGrid = `linear-gradient(to bottom, ${wash(accent, .36)} 0 1px, transparent 1px),linear-gradient(to bottom, ${wash(accent, .22)} 0 1px, transparent 1px),linear-gradient(to bottom, ${wash(accent, .13)} 0 1px, transparent 1px)${verticalRule}`;
  const plannerSize = `100% calc(100% / 6),100% calc(100% / 12),100% calc(100% / 48),100% 100%`;
  const canDraw = Boolean(edit && weekday);
  const minuteAt = (clientY: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return clampMin(snapMin(dayStart + ((clientY - rect.top) / rect.height) * daySpan), dayStart, dayEnd);
  };
  const drawLow = draw ? Math.min(draw.start, draw.end) : 0;
  const drawSpan = draw ? Math.abs(draw.end - draw.start) : 0;
  return <div data-timeline data-weekday={weekday} className={short ? "weekly-day-grid relative w-full" : "day-timeline relative w-full"} style={{ backgroundImage: plannerGrid, backgroundSize: plannerSize, backgroundRepeat: "repeat" }}>
    {canDraw ? <div
      className="absolute inset-0 z-0 cursor-crosshair touch-none"
      onPointerDown={(event) => { if (event.button !== 0) return; const start = minuteAt(event.clientY, event.currentTarget); event.currentTarget.setPointerCapture(event.pointerId); setDraw({ start, end: start }); }}
      onPointerMove={(event) => setDraw((current) => current ? { start: current.start, end: minuteAt(event.clientY, event.currentTarget) } : current)}
      onPointerUp={() => {
        setDraw((current) => {
          if (current && Math.abs(current.end - current.start) >= SLOT) {
            const range = clampRange(current.start, current.end);
            edit!.onDraw(weekday!, range.start, range.end);
          }
          return null;
        });
      }}
      onPointerCancel={() => setDraw(null)}
      aria-label={`Draw a schedule block for ${WEEKDAYS[(weekday ?? 1) - 1]}`}
    /> : null}
    {currentTime && toMinutes(currentTime) >= dayStart && toMinutes(currentTime) <= dayEnd ? <span className="pointer-events-none absolute inset-x-0 z-[2] -translate-y-1/2 border-t-2 border-coral" style={{ top: `${dayPosition(currentTime)}%` }} aria-hidden="true">{short ? null : <span className="absolute -left-0.75 -top-0.75 h-1.5 w-1.5 rounded-full bg-coral" />}</span> : null}
    {draw && drawSpan >= SLOT ? <div className="pointer-events-none absolute inset-x-1 z-[4] rounded-[3px] border border-dashed border-slate bg-slate/20" style={{ top: `${(drawLow / daySpan) * 100 - (dayStart / daySpan) * 100}%`, height: `${(drawSpan / daySpan) * 100}%` }} /> : null}
    {entries.map((entry) => <BlockBar key={entry.block.id} entry={entry} lane={laneFor.get(entry.block.id) || 0} laneCount={maxLane} compact={mobile} vertical={short} highlighted={highlightedPeople.has(entry.member.id)} onToggle={onToggle} edit={edit} />)}
  </div>;
}

function DayHero({ selectedDate, selectedDay, dateAccent, accent, clock, entries, openSessions, isToday, onToday, highlightedPeople, onToggle }: { selectedDate: Date; selectedDay: number; dateAccent: string; accent: string; clock: string; entries: BlockWithMember[]; openSessions: SessionWithMember[]; isToday: boolean; onToday: () => void; highlightedPeople: Set<number>; onToggle: (personId: number) => void }) {
  const moon = getMoonPhase(new Date());
  const isNight = Number(clock.slice(0, 2)) >= 18 || Number(clock.slice(0, 2)) < 6;
  return <div className="px-5 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-10 lg:pl-[128px]"><div className="grid w-full gap-8 sm:w-[68%] lg:grid-cols-[minmax(330px,.85fr)_minmax(0,1.15fr)] lg:gap-10">
    <div className="relative flex min-h-[220px] min-w-0 flex-col justify-between border border-[#EAEAEA] bg-[#FFFDF9]"><div className="flex flex-1 items-center justify-center px-4 py-7"><div className="grid w-full max-w-[420px] grid-cols-[minmax(0,0.85fr)_minmax(140px,1.5fr)_minmax(0,0.85fr)] border border-[#EAEAEA] font-display leading-none" style={{ color: dateAccent }}><div className="flex flex-col items-center justify-center border-r border-[#EAEAEA] px-2 py-4 sm:px-3"><span className="whitespace-nowrap text-[11px] font-bold tracking-[.12em]">{selectedDate.toLocaleString("en-US", { month: "short" }).toUpperCase()}</span><span className="mt-2 whitespace-nowrap text-xs font-medium tracking-[.12em]">{selectedDate.getFullYear()}</span></div><div className="flex min-w-0 items-center justify-center border-r border-[#EAEAEA] px-2 py-3 text-[4.75rem] font-extrabold tracking-[-.1em] sm:px-4 sm:text-[5.75rem]">{selectedDate.getDate()}</div><div className="flex flex-col items-center justify-center gap-2 px-2 py-4 sm:px-4" style={{ color: accent }}><span className="whitespace-nowrap text-3xl font-extrabold sm:text-4xl">{["月", "火", "水", "木", "金", "土", "日"][selectedDay]}</span><span className="whitespace-nowrap text-sm font-extrabold tracking-[.16em] sm:text-base">{WEEKDAYS[selectedDay].toUpperCase()}</span></div></div></div><div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 font-display text-xs font-extrabold tabular-nums sm:px-6"><span className="flex items-center gap-2" style={{ color: accent }}><span className="h-2 w-2 animate-pulse rounded-full bg-coral" />{clock}</span><span className={`flex items-center gap-2 whitespace-nowrap text-[10px] font-bold tracking-[.08em] ${isNight ? "moon-glow" : ""}`} style={{ color: accent }} title={`${moon.name}${isNight ? " · nighttime" : ""}`}><span className="text-base leading-none" aria-hidden="true">{moon.symbol}</span>{moon.name}</span><button type="button" onClick={onToday} disabled={isToday} className={`whitespace-nowrap font-display text-[10px] font-bold tracking-[.14em] transition ${isToday ? "text-ink/25" : "text-ink/45 hover:text-ink"}`} aria-label="Return to today" aria-pressed={isToday}>TODAY</button></div></div>
    <div className="w-full self-center"><TodayList entries={entries} openSessions={openSessions} highlightedPeople={highlightedPeople} onToggle={onToggle} /></div>
  </div></div>;
}

function TodayList({ entries, openSessions, highlightedPeople, onToggle }: { entries: BlockWithMember[]; openSessions: SessionWithMember[]; highlightedPeople: Set<number>; onToggle: (personId: number) => void }) {
  const scheduledIds = new Set(entries.map(({ member }) => member.id));
  // A person can hold more than one block in a day, so key on the block/session,
  // not the member — a duplicate member key was leaving the extra rows to be
  // clipped by the container as bare colour bars.
  const rows = [...entries.map(({ block, member }) => ({ key: `b${block.id}`, member, start: block.startTime, end: block.endTime })), ...openSessions.filter(({ member }) => !scheduledIds.has(member.id)).map(({ session, member }) => ({ key: `s${session.personId}`, member, start: session.startTime, end: "Now" }))];
  return <div className="flex flex-wrap gap-x-8 gap-y-1">
    {rows.map(({ key, member, start, end }) => { const on = highlightedPeople.has(member.id); return <button key={key} type="button" onClick={() => onToggle(member.id)} aria-pressed={on} aria-label={`Highlight ${firstName(member.fullName)}`} className="flex items-center gap-3 py-1.5 text-left transition hover:bg-ink/[.03]"><span className="h-8 w-1 shrink-0 rounded-[1px] transition" style={{ backgroundColor: on ? brighten(member.color) : member.color, boxShadow: on ? `0 0 0 1px ${brighten(member.color)}` : undefined }} /><span className="flex items-center gap-3"><span className={`whitespace-nowrap font-display text-sm ${nameTone(on)}`}>{firstName(member.fullName)}</span><span className="shrink-0 whitespace-nowrap font-display text-[11px] tabular-nums text-ink/55">{formatTime(start)}–{end === "Now" ? "now" : formatTime(end)}</span></span></button>; })}
  </div>;
}

function PeoplePalette({ people: roster, blocks, highlightedPeople, onToggle, admin = false, onReorder, confirmedHours }: { people: PublicPerson[]; blocks: BlockWithMember[]; highlightedPeople: Set<number>; onToggle: (personId: number) => void; admin?: boolean; onReorder?: (ids: number[]) => void; confirmedHours?: Map<number, number> }) {
  // admin_only people (e.g. the full-time RA) still get timeline bars, but are
  // kept out of this hours/colour roster entirely.
  const people = useMemo(() => roster.filter((member) => !member.adminOnly), [roster]);
  const byId = useMemo(() => new Map(people.map((member) => [member.id, member])), [people]);
  const serverOrder = useMemo(() => people.map((member) => member.id), [people]);
  const [order, setOrder] = useState<number[]>(serverOrder);
  const [dragId, setDragId] = useState<number | null>(null);
  useEffect(() => setOrder(serverOrder), [serverOrder.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const weeklyHours = useMemo(() => {
    const totals = new Map<number, number>();
    for (const { block, member } of blocks) totals.set(member.id, (totals.get(member.id) ?? 0) + (toMinutes(block.endTime) - toMinutes(block.startTime)) / 60);
    return totals;
  }, [blocks]);

  if (!admin) {
    const alphabetized = [...people].sort((a, b) => a.fullName.localeCompare(b.fullName));
    return <section className="px-5 pb-10 pt-2 sm:px-10"><div className="flex flex-wrap gap-x-7 gap-y-3">{alphabetized.map((member) => {
      const on = highlightedPeople.has(member.id);
      return <button key={member.id} type="button" onClick={() => onToggle(member.id)} aria-pressed={on} aria-label={`Highlight ${firstName(member.fullName)}`} className="flex items-center gap-2.5 text-left transition hover:opacity-80"><span className="h-3.5 w-3.5 shrink-0 rounded-[2px] transition" style={{ backgroundColor: on ? brighten(member.color) : member.color, boxShadow: on ? `0 0 0 1px ${brighten(member.color)}` : undefined }} /><span className={`font-display text-sm ${nameTone(on)}`}>{firstName(member.fullName)}</span></button>;
    })}</div></section>;
  }

  const ordered = order.map((id) => byId.get(id)).filter((member): member is PublicPerson => Boolean(member));
  for (const member of people) if (!order.includes(member.id)) ordered.push(member);

  const persist = (ids: number[]) => { setOrder(ids); if (ids.join(",") !== serverOrder.join(",")) onReorder?.(ids); };
  const dragOnto = (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== dragId);
      const at = next.indexOf(targetId);
      next.splice(at < 0 ? next.length : at, 0, dragId);
      return next;
    });
  };
  const sortAlpha = () => persist([...people].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((member) => member.id));

  return <section className="px-5 pb-10 pt-2 sm:px-10">
    <div className="flex justify-end">
      <button type="button" onClick={sortAlpha} className="font-display text-[10px] font-bold tracking-[.14em] text-ink/40 transition hover:text-ink" title="Sort people A–Z">A–Z</button>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ordered.map((member) => {
        const on = highlightedPeople.has(member.id);
        const scheduled = weeklyHours.get(member.id) ?? 0;
        const confirmed = confirmedHours?.get(member.id) ?? 0;
        const required = member.weeklyRequiredHours;
        const delta = Math.round((confirmed - required) * 100) / 100;
        const deltaLabel = required === 0 ? "no target" : delta === 0 ? "on target" : `${delta > 0 ? "+" : "−"}${formatHours(Math.abs(delta))}`;
        const deltaClass = required === 0 ? "text-ink/40" : delta < 0 ? "text-coral" : "text-slate";
        return <div
          key={member.id}
          draggable={admin}
          onDragStart={admin ? (event) => { event.dataTransfer.effectAllowed = "move"; setDragId(member.id); } : undefined}
          onDragOver={admin ? (event) => { event.preventDefault(); dragOnto(member.id); } : undefined}
          onDrop={admin ? (event) => event.preventDefault() : undefined}
          onDragEnd={admin ? () => { persist(order); setDragId(null); } : undefined}
          onClick={() => onToggle(member.id)}
          role="button"
          tabIndex={0}
          aria-pressed={on}
          aria-label={`Highlight ${firstName(member.fullName)} — ${formatHours(confirmed)} confirmed of ${formatHours(required)} required this week`}
          className={`flex items-start gap-2.5 border px-3 py-2.5 text-left transition ${on ? "border-ink/25 bg-ink/[.04]" : "border-ink/12 bg-[#FFFDF9] hover:border-ink/25"} ${admin ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${dragId === member.id ? "opacity-40" : ""}`}
        >
          {admin ? <GripVertical size={13} className="mt-0.5 shrink-0 text-ink/25" aria-hidden="true" /> : null}
          <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[2px] transition" style={{ backgroundColor: on ? brighten(member.color) : member.color, boxShadow: on ? `0 0 0 1px ${brighten(member.color)}` : undefined }} />
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-display text-sm ${nameTone(on)}`}>{firstName(member.fullName)}</span>
            <span className="mt-0.5 block font-display text-[11px] tabular-nums text-ink/55"><span className="font-bold text-ink/75">{formatHours(confirmed)}</span> conf · {formatHours(scheduled)} sched</span>
            <span className={`font-display text-[11px] font-bold tabular-nums ${deltaClass}`}>{deltaLabel} · {formatHours(required)} req</span>
          </span>
        </div>;
      })}
    </div>
  </section>;
}

function WeekDateBox({ day, date, selected, accent, onClick }: { day: string; date: Date; selected: boolean; accent: string; onClick: () => void }) {
  const dateColor = day === "Sun" ? sundayColor : accent;
  return <button onClick={onClick} className="min-w-0 text-left" aria-label={`Select ${day} ${date.getDate()}`}><div className="mx-1 my-2 flex min-h-[94px] flex-col items-center justify-center border bg-[#FFFDF9] px-2 py-2 transition" style={{ borderColor: selected ? dateColor : "#EAEAEA", backgroundColor: selected ? wash(dateColor, .09) : "#FFFDF9", color: dateColor }}><span className="font-display text-[10px] font-extrabold tracking-[.14em]">{day.toUpperCase()}</span><span className="mt-1 font-display text-4xl font-extrabold leading-none tracking-[-.08em]">{date.getDate()}</span><span className="mt-2 font-display text-[10px] font-bold tracking-[.12em]" style={{ color: wash(dateColor, .55) }}>{date.toLocaleString("en-US", { month: "short" }).toUpperCase()}</span></div></button>;
}

function AdminPopover({ blockId, entry, people, isNew, busy, onAssign, onRemove, onClose }: { blockId: number; entry: BlockWithMember; people: PublicPerson[]; isNew: boolean; busy: boolean; onAssign: (personId: number) => void; onRemove: () => void; onClose: () => void }) {
  const WIDTH = 172;
  const PANEL_H = 150;
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const place = () => {
      const bar = document.querySelector(`[data-block-id="${blockId}"]`);
      if (!bar) { onClose(); return; }
      const rect = bar.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.right + 6;
      if (left + WIDTH > vw - 8) left = rect.left - WIDTH - 6;
      left = Math.min(Math.max(8, left), vw - WIDTH - 8);
      let top = rect.top;
      top = Math.min(Math.max(8, top), Math.max(8, vh - PANEL_H - 8));
      setPos({ left, top });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);
  return <>
    <div className="fixed inset-0 z-40" onPointerDown={onClose} aria-hidden="true" />
    {pos ? <div className="fixed z-50 rounded-md border border-ink/15 bg-[#FFFDF9] p-2.5 shadow-[0_12px_40px_rgba(43,41,38,.2)]" style={{ left: pos.left, top: pos.top, width: WIDTH }} role="dialog" aria-label="Block settings">
      <p className="font-display text-[9px] font-bold uppercase tracking-[.16em] text-ink/45">{isNew ? "New block" : "Edit block"}</p>
      <label className="mt-1.5 block text-[10px] font-medium text-ink/55" htmlFor="admin-popover-person">Person</label>
      <select id="admin-popover-person" value={entry.block.personId} disabled={busy} onChange={(event) => onAssign(Number(event.target.value))} className="mt-1 w-full rounded border border-ink/20 bg-white px-1.5 py-1 font-display text-[11px] font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua">
        {people.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
      </select>
      <p className="mt-1.5 font-display text-[10px] tabular-nums text-ink/50">{WEEKDAYS[entry.block.weekday - 1]} · {formatTime(entry.block.startTime)}–{formatTime(entry.block.endTime)}</p>
      <button type="button" disabled={busy} onClick={onRemove} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-coral/30 px-2 py-1 font-display text-[10px] font-bold text-coral transition hover:bg-coral/10 disabled:opacity-50"><Trash2 size={11} /> Remove block</button>
    </div> : null}
  </>;
}

// Free-text notes for whichever day the board is showing. Loaded from
// /api/admin/note when the day changes, saved (per day) on blur.
function AdminNote({ date, onNotice }: { date: string; onNotice: (message: string | null) => void }) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const savedRef = useRef("");
  const dayLabel = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(`/api/admin/note?date=${date}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { body: "" }))
      .then((data) => {
        const next = typeof data?.body === "string" ? data.body : "";
        savedRef.current = next;
        setBody(next);
        setStatus("idle");
      })
      .catch((error) => { if (error?.name !== "AbortError") setStatus("idle"); });
    return () => controller.abort();
  }, [date]);

  const commit = () => {
    if (body === savedRef.current) return;
    const form = new FormData();
    form.set("date", date);
    form.set("body", body);
    setStatus("saving");
    saveAdminNote(form)
      .then(() => { savedRef.current = body; setStatus("saved"); onNotice(null); })
      .catch((error) => { setStatus("error"); onNotice(error instanceof Error ? error.message : "Could not save the note."); });
  };

  return <div className="flex flex-col">
    <div className="flex items-center justify-between">
      <label htmlFor="admin-note" className="font-display text-[10px] font-bold uppercase tracking-[.18em] text-ink/35">Notes · {dayLabel}</label>
      <span className="font-display text-[10px] tracking-[.1em] text-ink/30" aria-live="polite">{status === "loading" ? "…" : status === "saving" ? "saving…" : status === "saved" ? "saved" : status === "error" ? "not saved" : ""}</span>
    </div>
    <textarea id="admin-note" value={body} onChange={(event) => { setBody(event.target.value); setStatus("idle"); }} onBlur={commit} rows={4} placeholder={`Notes for ${dayLabel}…`} className="mt-1.5 min-h-[130px] w-full flex-1 resize-y border border-ink/15 bg-white px-3 py-2 font-quote text-[13px] leading-relaxed text-ink/75 placeholder:text-ink/25 transition focus:border-ink/40 focus:outline-none sm:text-sm" />
  </div>;
}

function ScheduleControl({ people, today, selectedDateValue, selectedDay, dayEntries, onNotice, onSaved }: {
  people: PublicPerson[];
  today: string;
  selectedDateValue: string;
  selectedDay: number;
  dayEntries: BlockWithMember[];
  onNotice: (message: string | null) => void;
  onSaved: () => void;
}) {
  const [, run] = useTransition();
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [personId, setPersonId] = useState(String(people[0]?.id ?? "new"));
  const [newName, setNewName] = useState("");
  const [requiredHours, setRequiredHours] = useState("10");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [scope, setScope] = useState<"day" | "term">("day");
  const [removeId, setRemoveId] = useState("");
  const [busy, setBusy] = useState(false);

  const isNew = personId === "new" || !people.length;
  const slots = useMemo(() => Array.from({ length: (19 - 7) * 4 + 1 }, (_, i) => toTime(7 * 60 + i * 15)), []);
  const dayText = new Date(`${selectedDateValue}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const removable = dayEntries.filter((entry) => entry.block.id > 0);
  const dayState = labStatusFor(selectedDateValue);
  const termOver = isTermOver(today);
  const addBlocked = scope === "term" && termOver;
  const field = "border border-ink/15 bg-white px-2 py-1.5 font-display text-xs text-ink transition focus:border-ink/40 focus:outline-none";

  const add = () => {
    if (scope === "term" && termOver) { onNotice("The term is over — nothing left to schedule."); return; }
    if (isNew && !newName.trim()) { onNotice("Enter a name for the new person."); return; }
    if (toMinutes(end) <= toMinutes(start)) { onNotice("End time must be after the start time."); return; }
    const form = new FormData();
    if (isNew) { form.set("newName", newName.trim()); form.set("requiredHours", requiredHours || "0"); }
    else form.set("personId", personId);
    form.set("date", selectedDateValue);
    form.set("startTime", start);
    form.set("endTime", end);
    form.set("scope", scope);
    setBusy(true);
    run(async () => {
      try { await addScheduleBlock(form); onNotice(null); setNewName(""); if (isNew) setPersonId(String(people[0]?.id ?? "new")); onSaved(); }
      catch (error) { onNotice(error instanceof Error ? error.message : "Could not add that block."); }
      finally { setBusy(false); }
    });
  };
  const remove = () => {
    if (!removeId) { onNotice("Pick a block to remove."); return; }
    const entry = removable.find((item) => String(item.block.id) === removeId);
    const form = new FormData();
    form.set("id", removeId);
    if (entry) form.set("version", String(entry.block.version));
    setBusy(true);
    run(async () => {
      try { await deleteWeeklyBlock(form); onNotice(null); setRemoveId(""); onSaved(); }
      catch (error) { onNotice(error instanceof Error ? error.message : "Could not remove that block."); }
      finally { setBusy(false); }
    });
  };

  return <div className="flex flex-col">
    <div className="flex items-center justify-between">
      <span className="font-display text-[10px] font-bold uppercase tracking-[.18em] text-ink/35">Schedule</span>
      <span className="flex gap-2">
        {(["add", "remove"] as const).map((value) => <button key={value} type="button" onClick={() => { setMode(value); onNotice(null); }} className={`font-display text-[10px] font-bold uppercase tracking-[.12em] transition ${mode === value ? "text-ink" : "text-ink/30 hover:text-ink/60"}`}>{value}</button>)}
      </span>
    </div>
    <div className="mt-1.5 flex-1 border border-ink/12 bg-[#FFFDF9] p-3">
      {mode === "add" ? <div className="space-y-2.5">
        <div>
          <label className="mb-1 block font-display text-[10px] font-medium uppercase tracking-[.1em] text-ink/45">Who</label>
          <select value={personId} onChange={(event) => setPersonId(event.target.value)} className={`${field} w-full`}>
            {people.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}
            <option value="new">＋ New person…</option>
          </select>
        </div>
        {isNew ? <div>
          <div className="flex gap-2">
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Full name" className={`${field} min-w-0 flex-1`} />
            <input value={requiredHours} onChange={(event) => setRequiredHours(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" aria-label="Required hours per week" title="Required hours per week" className={`${field} w-14 shrink-0 text-center`} />
          </div>
          <p className="mt-1 font-display text-[9px] text-ink/40">New person — full name and required hours / week.</p>
        </div> : null}
        <div>
          <label className="mb-1 block font-display text-[10px] font-medium uppercase tracking-[.1em] text-ink/45">Time</label>
          <div className="flex items-center gap-2">
            <select value={start} onChange={(event) => setStart(event.target.value)} className={`${field} min-w-0 flex-1`}>{slots.map((slot) => <option key={slot} value={slot}>{formatTime(slot)}</option>)}</select>
            <span className="font-display text-[10px] text-ink/40">to</span>
            <select value={end} onChange={(event) => setEnd(event.target.value)} className={`${field} min-w-0 flex-1`}>{slots.map((slot) => <option key={slot} value={slot}>{formatTime(slot)}</option>)}</select>
          </div>
        </div>
        <div className="space-y-1 pt-0.5">
          <label className="flex items-center gap-2 font-display text-[11px] text-ink/70"><input type="radio" name="schedule-scope" checked={scope === "day"} onChange={() => setScope("day")} className="accent-slate" /> {dayText} only</label>
          <label className={`flex items-center gap-2 font-display text-[11px] ${termOver ? "text-ink/35" : "text-ink/70"}`}><input type="radio" name="schedule-scope" checked={scope === "term"} disabled={termOver} onChange={() => setScope("term")} className="accent-slate" /> Every {WEEKDAYS[selectedDay]}, ongoing</label>
        </div>
        {scope === "day" && dayState.status !== "in" ? <p className="font-display text-[9px] leading-relaxed text-ink/45">{dayText} is {dayState.status === "remote" ? "a remote day" : `closed by default (${dayState.reason})`} — this adds hours to it anyway.</p> : null}
        {addBlocked ? <p className="font-display text-[9px] leading-relaxed text-coral/80">The term has ended.</p> : null}
        <button type="button" disabled={busy || addBlocked} onClick={add} className="w-full bg-ink px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[.12em] text-paper-deep transition hover:bg-slate disabled:opacity-50">Add block</button>
      </div> : <div className="space-y-2.5">
        <div>
          <label className="mb-1 block font-display text-[10px] font-medium uppercase tracking-[.1em] text-ink/45">Block on {dayText}</label>
          <select value={removeId} onChange={(event) => setRemoveId(event.target.value)} className={`${field} w-full`}>
            <option value="">Choose a block…</option>
            {removable.map((entry) => <option key={entry.block.id} value={entry.block.id}>{firstName(entry.member.fullName)} · {formatTime(entry.block.startTime)}–{formatTime(entry.block.endTime)}</option>)}
          </select>
        </div>
        <button type="button" disabled={busy || !removeId} onClick={remove} className="flex w-full items-center justify-center gap-1.5 border border-coral/40 px-3 py-2 font-display text-[11px] font-bold uppercase tracking-[.12em] text-coral transition hover:bg-coral/10 disabled:opacity-40"><Trash2 size={12} /> Remove block</button>
        <p className="font-display text-[9px] leading-relaxed text-ink/40">Removes the recurring slot from the team schedule.</p>
      </div>}
    </div>
  </div>;
}

export function PublicBoard({ today, now, people, blocks, openSessions, attendance = [], admin = false }: { today: string; now: string; people: PublicPerson[]; blocks: BlockWithMember[]; openSessions: SessionWithMember[]; attendance?: { weeklyBlockId: number; attendDate: string }[]; admin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startSaving] = useTransition();
  // Seed from ?d= so a post-save router.refresh() (or a remount) keeps the board
  // on the day the admin was editing instead of snapping back to today.
  const [selectedDateValue, setSelectedDateValue] = useState(() => {
    // useSearchParams() can be null on the first client render (CSR bail-out),
    // so read it defensively.
    const fromUrl = searchParams?.get("d");
    return fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) ? fromUrl : today;
  });
  const [clock, setClock] = useState(now);
  const [highlightedPeople, setHighlightedPeople] = useState<Set<number>>(new Set());
  const [highlightedDays, setHighlightedDays] = useState<Set<number>>(() => new Set([new Date(`${today}T12:00:00`).getDay() === 0 ? 6 : new Date(`${today}T12:00:00`).getDay() - 1]));
  const [entries, setEntries] = useState<BlockWithMember[]>(blocks);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ id: number } | null>(null);
  const [attendFor, setAttendFor] = useState<number | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<Record<string, boolean>>({});
  const dragRef = useRef<DragState | null>(null);
  const tempIdRef = useRef(-1);

  // Attendance is confirmed per (block, calendar date) for the current lab week.
  const weekMonday = useMemo(() => getMonday(today), [today]);
  const attendDateForWeekday = (weekday: number) => addDays(weekMonday, weekday - 1);
  const confirmedSet = useMemo(() => new Set(attendance.map((row) => `${row.weeklyBlockId}:${row.attendDate}`)), [attendance]);
  useEffect(() => {
    setConfirmOverride((current) => {
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(current)) if (confirmedSet.has(key) !== value) next[key] = value;
      return next;
    });
  }, [confirmedSet]);
  useEffect(() => {
    if (!searchParams) return;
    const current = searchParams.get("d") ?? "";
    const desired = selectedDateValue === today ? "" : selectedDateValue;
    if (current === desired) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (desired) params.set("d", desired); else params.delete("d");
    const query = params.toString();
    const base = pathname ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    router.replace(query ? `${base}?${query}` : base, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateValue, today]);
  useEffect(() => {
    const tick = () => setClock(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!admin) return;
    setEntries((current) => [...blocks, ...current.filter((entry) => entry.block.id < 0)]);
    setEdits((current) => {
      const next: Record<number, Edit> = {};
      for (const key of Object.keys(current)) {
        const id = Number(key);
        if (id < 0) { next[id] = current[id]; continue; }
        const saved = blocks.find((entry) => entry.block.id === id);
        if (!saved) continue;
        const change = current[id];
        const settled = change.weekday === saved.block.weekday && change.start === toMinutes(saved.block.startTime) && change.end === toMinutes(saved.block.endTime) && change.personId === saved.block.personId;
        if (!settled) next[id] = change;
      }
      return next;
    });
  }, [blocks, admin]);

  const posFor = (block: WeeklyBlock): Pos => edits[block.id] ?? { weekday: block.weekday, start: toMinutes(block.startTime), end: toMinutes(block.endTime) };
  const personIdFor = (id: number): number => edits[id]?.personId ?? entries.find((entry) => entry.block.id === id)?.block.personId ?? people[0]?.id ?? 0;
  const setEdit = (id: number, value: Edit | null) => setEdits((current) => {
    if (!value) { const nextEdits = { ...current }; delete nextEdits[id]; return nextEdits; }
    return { ...current, [id]: value };
  });

  const boardBlocks = useMemo<BlockWithMember[]>(() => {
    if (!admin) return blocks;
    return entries.map((entry) => {
      const pos = posFor(entry.block);
      const personId = edits[entry.block.id]?.personId ?? entry.block.personId;
      const member = personId === entry.block.personId ? entry.member : (people.find((person) => person.id === personId) ?? entry.member);
      return { member, block: { ...entry.block, personId, weekday: pos.weekday, startTime: toTime(pos.start), endTime: toTime(pos.end) } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, entries, edits, blocks, people]);

  const attendKeyFor = (id: number): string | null => {
    const saved = entries.find((entry) => entry.block.id === id);
    return saved && id > 0 ? `${id}:${attendDateForWeekday(saved.block.weekday)}` : null;
  };
  const isConfirmed = (id: number): boolean => {
    const key = attendKeyFor(id);
    if (!key) return false;
    return key in confirmOverride ? confirmOverride[key] : confirmedSet.has(key);
  };
  const toggleConfirm = (id: number) => {
    const saved = entries.find((entry) => entry.block.id === id);
    const key = attendKeyFor(id);
    if (!saved || !key) return;
    const date = attendDateForWeekday(saved.block.weekday);
    const next = !isConfirmed(id);
    setConfirmOverride((current) => ({ ...current, [key]: next }));
    setAttendFor(id);
    const form = new FormData();
    form.set("blockId", String(id));
    form.set("date", date);
    startSaving(async () => {
      try {
        if (next) await confirmAttendance(form); else await clearAttendance(form);
        setNotice(null);
        router.refresh();
      } catch (error) {
        setConfirmOverride((current) => { const clone = { ...current }; delete clone[key]; return clone; });
        setNotice(error instanceof Error ? error.message : "Could not update attendance.");
      }
    });
  };
  const confirmedHoursByPerson = useMemo(() => {
    const totals = new Map<number, number>();
    if (!admin) return totals;
    for (const { block, member } of boardBlocks) {
      if (block.id < 0) continue;
      const key = `${block.id}:${attendDateForWeekday(block.weekday)}`;
      const on = key in confirmOverride ? confirmOverride[key] : confirmedSet.has(key);
      if (on) totals.set(member.id, (totals.get(member.id) ?? 0) + (toMinutes(block.endTime) - toMinutes(block.startTime)) / 60);
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, boardBlocks, confirmedSet, confirmOverride, weekMonday]);

  const startDrag = (event: React.PointerEvent, id: number, mode: DragState["mode"], crossDay: boolean) => {
    if (event.button !== 0) return;
    const timeline = (event.currentTarget as HTMLElement).closest("[data-timeline]") as HTMLElement | null;
    const entry = entries.find((item) => item.block.id === id);
    if (!timeline || !entry) return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = { id, mode, crossDay, startX: event.clientX, startY: event.clientY, mpp: daySpan / timeline.getBoundingClientRect().height, startPos: posFor(entry.block), personId: personIdFor(id), moved: false };
  };
  const dragMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 4 && Math.abs(event.clientY - drag.startY) < 4) return;
    drag.moved = true;
    const deltaMin = snapMin((event.clientY - drag.startY) * drag.mpp);
    let { weekday, start, end } = drag.startPos;
    if (drag.mode === "move") {
      const duration = end - start;
      start = clampMin(start + deltaMin, dayStart, dayEnd - duration);
      end = start + duration;
      if (drag.crossDay) {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-weekday]")?.getAttribute("data-weekday");
        if (target) weekday = Number(target);
      }
    } else if (drag.mode === "top") {
      start = clampMin(start + deltaMin, dayStart, end - SLOT);
    } else {
      end = clampMin(end + deltaMin, start + SLOT, dayEnd);
    }
    setEdit(drag.id, { weekday, start, end, personId: drag.personId });
  };
  const dragEnd = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    try { (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId); } catch { /* capture already gone */ }
    if (drag.moved || drag.mode !== "move") return;
    // A plain click on a bar with a pending edit reopens its editor popover;
    // on a settled bar it toggles the attendance confirm controls.
    if (drag.id < 0 || drag.id in edits) setPopover({ id: drag.id });
    else setAttendFor((current) => current === drag.id ? null : drag.id);
  };
  const drawBlock = (weekday: number, start: number, end: number) => {
    const member = people[0];
    if (!member) return;
    const id = tempIdRef.current;
    tempIdRef.current -= 1;
    setEntries((current) => [...current, { member, block: { id, personId: member.id, weekday, startTime: toTime(start), endTime: toTime(end), effectiveFrom: today, effectiveTo: null, version: 1, loggedBy: null, createdAt: new Date(), updatedAt: new Date() } }]);
    setEdit(id, { weekday, start, end, personId: member.id });
    setPopover({ id });
  };
  const assignPerson = (id: number, personId: number) => {
    const entry = entries.find((item) => item.block.id === id);
    if (!entry) return;
    const pos = posFor(entry.block);
    setEdit(id, { weekday: pos.weekday, start: pos.start, end: pos.end, personId });
  };
  const commitBlock = (id: number) => {
    const entry = entries.find((item) => item.block.id === id);
    if (!entry) return;
    const pos = posFor(entry.block);
    const form = new FormData();
    form.set("personId", String(personIdFor(id)));
    form.set("weekday", String(pos.weekday));
    form.set("startTime", toTime(pos.start));
    form.set("endTime", toTime(pos.end));
    form.set("effectiveFrom", entry.block.effectiveFrom || today);
    setSavingIds((current) => new Set(current).add(id));
    startSaving(async () => {
      try {
        if (id < 0) {
          await createWeeklyBlock(form);
          setEntries((current) => current.filter((item) => item.block.id !== id));
        } else {
          form.set("id", String(id));
          form.set("version", String(entry.block.version));
          await updateWeeklyBlock(form);
        }
        setEdit(id, null);
        setNotice(null);
        setPopover((current) => current?.id === id ? null : current);
        router.refresh();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not save that change.");
      } finally {
        setSavingIds((current) => { const nextIds = new Set(current); nextIds.delete(id); return nextIds; });
      }
    });
  };
  const revertBlock = (id: number) => {
    if (id < 0) setEntries((current) => current.filter((item) => item.block.id !== id));
    setEdit(id, null);
    setPopover((current) => current?.id === id ? null : current);
  };
  const removeBlock = (id: number) => {
    setPopover(null);
    if (id < 0) { revertBlock(id); return; }
    const entry = entries.find((item) => item.block.id === id);
    const form = new FormData();
    form.set("id", String(id));
    if (entry) form.set("version", String(entry.block.version));
    setSavingIds((current) => new Set(current).add(id));
    startSaving(async () => {
      try {
        await deleteWeeklyBlock(form);
        setEntries((current) => current.filter((item) => item.block.id !== id));
        setEdit(id, null);
        setNotice(null);
        router.refresh();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not remove that block.");
      } finally {
        setSavingIds((current) => { const nextIds = new Set(current); nextIds.delete(id); return nextIds; });
      }
    });
  };
  const reorderPalette = (ids: number[]) => {
    if (!admin) return;
    const form = new FormData();
    form.set("ids", ids.join(","));
    startSaving(async () => {
      try {
        await reorderPeople(form);
        setNotice(null);
        router.refresh();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not save the new order.");
      }
    });
  };
  const makeEditApi = (crossDay: boolean): BarEditApi => ({
    crossDay,
    isDirty: (id) => id < 0 || id in edits,
    isSaving: (id) => savingIds.has(id),
    isConfirmed,
    isAttendOpen: (id) => attendFor === id,
    onDraw: drawBlock,
    onBarPointerDown: (event, id) => startDrag(event, id, "move", crossDay),
    onEdgePointerDown: (event, id, edge) => startDrag(event, id, edge, crossDay),
    onDragMove: dragMove,
    onDragEnd: dragEnd,
    onCommit: commitBlock,
    onRevert: revertBlock,
    onToggleConfirm: toggleConfirm,
    onDismissAttend: () => setAttendFor(null),
    onOpenEditor: (id) => { setAttendFor(null); setPopover({ id }); },
  });
  const dayEditApi = admin ? makeEditApi(false) : undefined;
  const weekEditApi = admin ? makeEditApi(true) : undefined;

  // On a day the lab is closed by default (break or holiday) the recurring team
  // schedule is hidden, but hours pinned to exactly that date still show — the
  // "no lab" windows are a default, not a lock.
  const byDay = useMemo(() => {
    const monday = getMonday(selectedDateValue);
    return WEEKDAYS.map((_, index) => {
      const date = addDays(monday, index);
      const closed = labStatusFor(date).status === "off";
      return boardBlocks.filter(({ block }) => block.weekday === index + 1
        && (!closed || (block.effectiveFrom === date && block.effectiveTo === date)));
    });
  }, [boardBlocks, selectedDateValue]);
  const selectedDate = new Date(`${selectedDateValue}T12:00:00`);
  const selectedDay = (selectedDate.getDay() + 6) % 7;
  const selectedWeekMonday = getMonday(selectedDateValue);
  const dayStatus = labStatusFor(selectedDateValue);
  const dateLabel = (index: number) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(dateForDay(index)));
  const fullDate = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(selectedDate).toUpperCase();
  const currentEntries = byDay[selectedDay];
  const dateForDay = (index: number) => new Date(`${selectedWeekMonday}T12:00:00`).setDate(new Date(`${selectedWeekMonday}T12:00:00`).getDate() + index);
  const shiftSelectedDate = (days: number) => setSelectedDateValue((value) => addDays(value, days));
  const toggleWeekday = (index: number) => {
    setSelectedDateValue(dateValueForDay(index));
    setHighlightedDays((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };
  const togglePerson = (personId: number) => setHighlightedPeople((current) => { const next = new Set(current); if (next.has(personId)) next.delete(personId); else next.add(personId); return next; });
  const selectedMonth = selectedDate.getMonth() + 1;
  const selectedDayNumber = selectedDate.getDate();
  const selectedKanji = ["月", "火", "水", "木", "金", "土", "日"][selectedDay];
  const monthAccent = hues[selectedDate.getMonth()];
  const dateAccent = selectedDay === 6 ? sundayColor : monthAccent;
  const dateValueForDay = (index: number) => new Date(dateForDay(index)).toISOString().slice(0, 10);
  const weekStart = new Date(dateForDay(0));
  const weekEnd = new Date(dateForDay(4));
  const weekStartMonth = weekStart.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const weekEndMonth = weekEnd.toLocaleString("en-US", { month: "short" }).toUpperCase();
  return <div className="min-h-screen px-4 pb-20 sm:px-8" style={{ backgroundImage: `linear-gradient(135deg, ${wash(monthAccent, .18)}, ${wash(monthAccent, .08)} 48%, rgba(255,253,249,.72))` }}>
    <section className="mx-auto max-w-[1280px] overflow-hidden border-x border-ink/20 bg-[#FFFDF9] shadow-[0_16px_50px_rgba(43,41,38,.08)]">
      <div className="mx-auto flex w-full items-center justify-between gap-4 bg-paper-deep px-5 py-4 sm:px-6">
        <Link href="/" aria-label="RABO home" className="flex items-end gap-3"><span className="font-display text-2xl font-extrabold tracking-[.06em]">RABO</span><span className="text-sm font-extrabold tracking-[.16em]" style={{ color: monthAccent }}>ランラボ</span></Link>
        <a href="https://yangran.org/" target="_blank" rel="noreferrer" className="border border-ink/25 px-3 py-2 font-display text-[11px] font-bold tracking-[.08em] text-ink/60 transition hover:border-ink/60 hover:text-ink">yangran.org ↗</a>
      </div>
      <div className="px-5 py-1.5 sm:px-10" style={{ backgroundColor: monthAccent }} />
      <DayHero selectedDate={selectedDate} selectedDay={selectedDay} dateAccent={dateAccent} accent={monthAccent} clock={clock} entries={currentEntries} openSessions={selectedDateValue === today ? openSessions : []} isToday={selectedDateValue === today} onToday={() => setSelectedDateValue(today)} highlightedPeople={highlightedPeople} onToggle={togglePerson} />
      <div className="relative px-5 pb-8 sm:px-6">
        <button aria-label="Previous day" onClick={() => shiftSelectedDate(-1)} className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink/35 transition hover:text-ink"><ChevronLeft size={21} strokeWidth={1.5} /></button><button aria-label="Next day" onClick={() => shiftSelectedDate(1)} className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink/35 transition hover:text-ink"><ChevronRight size={21} strokeWidth={1.5} /></button>
        <span className="absolute right-0 top-[33%] z-10 flex h-11 w-11 items-center justify-center font-display text-xl font-extrabold" style={{ backgroundColor: monthAccent, color: "#FFFDF9" }} aria-label={`Month ${selectedMonth}`}>{selectedMonth}</span>
        {dayStatus.status === "in" ? null : <p className="mb-3 text-center font-display text-[11px] font-bold uppercase tracking-[.14em] text-ink/40">{dayStatus.status === "remote" ? `Remote day · in person optional` : `Not in session · ${dayStatus.reason}`}</p>}
        <div className="mx-0 grid w-full sm:w-[90%] grid-cols-[52px_16px_minmax(0,1fr)] sm:grid-cols-[82px_22px_minmax(0,1fr)]"><HourAxis accent={monthAccent} /><DensityBand entries={currentEntries} color={monthAccent} /><div className="min-w-0"><DayTimeline entries={currentEntries} accent={monthAccent} currentTime={selectedDateValue === today ? clock : undefined} highlightedPeople={highlightedPeople} onToggle={togglePerson} edit={dayEditApi} weekday={selectedDay + 1} /></div></div>
      </div>
      {admin ? <div className="px-5 pt-8 sm:px-6">
        <div className="grid items-stretch gap-6 sm:ml-[104px] lg:grid-cols-2 lg:gap-8">
          <AdminNote date={selectedDateValue} onNotice={setNotice} />
          <ScheduleControl people={people} today={today} selectedDateValue={selectedDateValue} selectedDay={selectedDay} dayEntries={currentEntries} onNotice={setNotice} onSaved={() => router.refresh()} />
        </div>
      </div> : null}
      <DayExtras selectedDate={selectedDate} selectedDay={selectedDay} blocks={blocks} today={today} accent={monthAccent} onSelectDate={(date) => setSelectedDateValue(date.toISOString().slice(0, 10))} />
      <section className="weekly-spread relative px-5 pb-10 pt-8 sm:px-10 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="font-display text-[11px] font-bold tracking-[.18em]" style={{ color: monthAccent }}>THE WEEK</p><div className="mt-2 flex min-h-[128px] min-w-0 max-w-[480px] flex-col justify-between border border-[#EAEAEA] bg-[#FFFDF9] lg:ml-[52px]"><div className="flex flex-1 items-center justify-center px-4 py-5"><div className="grid w-full grid-cols-[minmax(0,0.72fr)_minmax(150px,1.6fr)_minmax(0,0.72fr)] border border-[#EAEAEA] font-display leading-none" style={{ color: monthAccent }}><div className="flex flex-col items-center justify-center border-r border-[#EAEAEA] px-2 py-4 sm:px-3"><span className="whitespace-nowrap text-[11px] font-bold tracking-[.12em]">{weekStartMonth}{weekStartMonth === weekEndMonth ? "" : `–${weekEndMonth}`}</span><span className="mt-2 whitespace-nowrap text-xs font-medium tracking-[.12em]">{weekStart.getFullYear()}</span></div><div className="flex min-w-0 items-center justify-center gap-2 border-r border-[#EAEAEA] px-2 py-3 text-[3.25rem] font-extrabold tracking-[-.06em] sm:px-4 sm:text-[4rem]"><span>{weekStart.getDate()}</span><span className="font-medium text-ink/30">–</span><span>{weekEnd.getDate()}</span></div><div className="flex flex-col items-center justify-center gap-2 px-2 py-4 sm:px-4"><span className="whitespace-nowrap text-2xl font-extrabold sm:text-3xl">週</span><span className="whitespace-nowrap text-[11px] font-extrabold tracking-[.16em] sm:text-xs">WEEK</span></div></div></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAEAEA] px-4 py-2.5 font-display text-[10px] font-medium tracking-[.14em] text-ink/45 sm:px-5"><span className="font-extrabold tracking-[.08em] text-ink/55">{dateLabel(0)} – {dateLabel(4)}</span><span>{fullDate}</span></div></div></div><div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-ink/55"><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-ink bg-ink/10" /> booked</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[3px] border-coral bg-coral/15" /> in now</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-4 border-t-[2px] border-dashed border-ink bg-ink/10" /> one-off</span></div></div>
        <div className="pointer-events-none absolute inset-x-0 top-[390px] z-10 hidden justify-between lg:flex"><button type="button" onClick={() => shiftSelectedDate(-7)} className="pointer-events-auto flex h-10 w-10 items-center justify-center text-ink/35 transition hover:text-ink" aria-label="Previous week"><ChevronLeft size={21} strokeWidth={1.5} /></button><button type="button" onClick={() => shiftSelectedDate(7)} className="pointer-events-auto flex h-10 w-10 items-center justify-center text-ink/35 transition hover:text-ink" aria-label="Next week"><ChevronRight size={21} strokeWidth={1.5} /></button></div>
        <div className="hidden overflow-hidden lg:block"><div className="grid grid-cols-[52px_repeat(5,minmax(0,1fr))]"><div className="flex items-center px-2 py-3 font-display text-[10px] font-bold tracking-[.18em]" style={{ color: monthAccent }}>TIME</div>{WEEKDAYS.slice(0, 5).map((day, index) => <WeekDateBox key={day} day={day} date={new Date(dateForDay(index))} selected={highlightedDays.has(index)} accent={monthAccent} onClick={() => toggleWeekday(index)} />)}<div><HourAxis short accent={monthAccent} /></div>{WEEKDAYS.slice(0, 5).map((day, index) => { const status = labStatusFor(dateValueForDay(index)); return <div key={`timeline-${day}`} className="relative min-w-0 border-l border-ink/12 px-1.5" style={highlightedDays.has(index) ? { backgroundColor: wash(monthAccent, .08) } : undefined}><DayTimeline entries={byDay[index]} accent={monthAccent} currentTime={dateValueForDay(index) === today ? clock : undefined} highlightedPeople={highlightedPeople} onToggle={togglePerson} edit={weekEditApi} weekday={index + 1} short />{status.status === "off" ? <span className="pointer-events-none absolute inset-x-0 top-1/2 z-[5] -translate-y-1/2 text-center font-display text-[9px] font-bold uppercase tracking-[.12em] text-ink/25">no lab</span> : status.status === "remote" ? <span className="pointer-events-none absolute inset-x-0 top-0.5 z-[5] text-center font-display text-[8px] font-bold uppercase tracking-[.1em] text-ink/30">remote</span> : null}</div>; })}</div></div>
        <div className="lg:hidden">
          <div className="mb-1 flex items-center gap-2 font-display text-[8px] font-bold uppercase tracking-[.12em]" style={{ color: wash(monthAccent, .8) }}>
            <span className="w-[64px] shrink-0" aria-hidden="true" />
            <div className="relative min-w-0 flex-1"><span className="invisible">.</span>{[7, 10, 13, 16, 19].map((h, i) => <span key={h} className={`absolute top-0 ${i === 0 ? "" : i === 4 ? "-translate-x-full" : "-translate-x-1/2"}`} style={{ left: `${(i / 4) * 100}%` }}>{h % 12 || 12}{h < 12 ? "a" : "p"}</span>)}</div>
          </div>
          <div className="space-y-1.5">{WEEKDAYS.slice(0, 5).map((day, index) => {
            const columnDate = dateValueForDay(index);
            const status = labStatusFor(columnDate);
            const rows = byDay[index];
            const { laneFor, laneCount } = layoutLanes(rows);
            const nowMin = toMinutes(clock);
            return <div key={day} className="flex w-full items-stretch gap-2" style={highlightedDays.has(index) ? { backgroundColor: wash(monthAccent, .08) } : undefined}>
              <WeekDateBox day={day} date={new Date(dateForDay(index))} selected={highlightedDays.has(index)} accent={monthAccent} onClick={() => toggleWeekday(index)} />
              <button type="button" onClick={() => setSelectedDateValue(columnDate)} aria-label={`Open ${day} ${new Date(dateForDay(index)).getDate()}`} className="relative min-w-0 flex-1 self-stretch overflow-hidden border border-ink/12 bg-[#FFFDF9]">
                <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(to right, ${wash(monthAccent, .16)} 0 1px, transparent 1px calc(100% / 6))` }} />
                {columnDate === today && nowMin >= dayStart && nowMin <= dayStart + daySpan ? <span className="pointer-events-none absolute inset-y-0 z-[3] w-px bg-coral" style={{ left: `${((nowMin - dayStart) / daySpan) * 100}%` }} /> : null}
                {status.status !== "in" ? <span className={`pointer-events-none absolute right-0 top-0 z-[4] bg-[#FFFDF9]/85 px-1 font-display text-[8px] font-bold uppercase tracking-[.1em] ${status.status === "off" ? "text-ink/25" : "text-ink/40"}`}>{status.status === "off" ? "no lab" : "remote"}</span> : null}
                {rows.length === 0
                  ? null
                  : rows.map((entry) => { const s = toMinutes(entry.block.startTime); const e = toMinutes(entry.block.endTime); const lane = laneFor.get(entry.block.id) ?? 0; const on = highlightedPeople.has(entry.member.id); return <span key={entry.block.id} title={`${firstName(entry.member.fullName)} · ${formatTime(entry.block.startTime)}–${formatTime(entry.block.endTime)}`} className="pointer-events-none absolute rounded-[1px] border-l-2" style={{ left: `${((s - dayStart) / daySpan) * 100}%`, width: `max(3px, calc(${((e - s) / daySpan) * 100}% - 1px))`, top: `calc(${(lane / laneCount) * 100}% + 1px)`, height: `calc(${100 / laneCount}% - 2px)`, backgroundColor: on ? wash(darken(entry.member.color, .08), .55) : wash(entry.member.color, .32), borderLeftColor: entry.member.color }} />; })}
              </button>
            </div>;
          })}</div>
        </div>
        <PeoplePalette people={people} blocks={boardBlocks} highlightedPeople={highlightedPeople} onToggle={togglePerson} admin={admin} onReorder={reorderPalette} confirmedHours={confirmedHoursByPerson} />
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 bg-paper-deep px-5 py-4 font-display text-[10px] font-medium tracking-[.14em] text-ink/50 sm:px-10"><span>RABO.YANGRAN.ORG · © Yang Ran 2026</span><span className="flex flex-wrap items-center justify-end gap-4"><FooterWeather /></span></footer>
    </section>
    {admin && popover ? (() => {
      const target = boardBlocks.find((item) => item.block.id === popover.id);
      return target ? <AdminPopover blockId={popover.id} entry={target} people={people} isNew={popover.id < 0} busy={savingIds.has(popover.id)} onAssign={(personId) => assignPerson(popover.id, personId)} onRemove={() => removeBlock(popover.id)} onClose={() => setPopover(null)} /> : null;
    })() : null}
    {admin && notice ? <div className="fixed inset-x-0 top-3 z-[60] flex justify-center px-4" role="status">
      <div className="flex items-center gap-3 rounded-md border border-coral/40 bg-[#FFFDF9] px-3 py-2 font-display text-xs font-bold text-ink shadow-[0_12px_40px_rgba(43,41,38,.18)]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-coral" />
        <span>{notice}</span>
        <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-ink/40 transition hover:text-ink"><X size={13} strokeWidth={3} /></button>
      </div>
    </div> : null}
  </div>;
}
