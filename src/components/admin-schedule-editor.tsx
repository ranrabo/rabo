"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PublicPerson, WeeklyBlock } from "@/db/schema";
import { addDays, formatTime, firstName, toMinutes, WEEKDAYS } from "@/lib/utils";
import { createWeeklyBlock, deleteWeeklyBlock, updateWeeklyBlock } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type BlockEntry = { block: WeeklyBlock; member: PublicPerson };
type Draft = { id?: number; personId: number; weekday: number; startTime: string; endTime: string; effectiveFrom: string };

const DAY_START = 7 * 60;
const DAY_END = 19 * 60;
const SLOT = 15;

const toTime = (minutes: number) => String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
const snap = (minutes: number) => Math.max(DAY_START, Math.min(DAY_END, Math.round(minutes / SLOT) * SLOT));
const clampRange = (first: number, second: number) => {
  let start = Math.min(first, second);
  let end = Math.max(first, second);
  if (end - start < SLOT) {
    end = Math.min(DAY_END, start + SLOT);
    if (end - start < SLOT) start = DAY_END - SLOT;
  }
  return { start, end };
};

const blockStyle = (block: { startTime: string; endTime: string }) => ({
  top: String(((toMinutes(block.startTime) - DAY_START) / (DAY_END - DAY_START)) * 100) + "%",
  height: String(((toMinutes(block.endTime) - toMinutes(block.startTime)) / (DAY_END - DAY_START)) * 100) + "%",
});

function TimelineDay({ day, entries, preview, onCreate, onSelect, onMove }: {
  day: number;
  entries: BlockEntry[];
  preview?: Draft;
  onCreate: (weekday: number, start: number, end: number) => void;
  onSelect: (entry: BlockEntry) => void;
  onMove: (id: number, weekday: number, start: number, end: number) => void;
}) {
  const [drawing, setDrawing] = useState<{ start: number; end: number } | null>(null);
  const lanes: BlockEntry[][] = [];
  const laneFor = new Map<number, number>();
  [...entries].sort((a, b) => toMinutes(a.block.startTime) - toMinutes(b.block.startTime)).forEach((entry) => {
    let lane = 0;
    while (lanes[lane]?.some((other) => toMinutes(other.block.endTime) > toMinutes(entry.block.startTime))) lane += 1;
    lanes[lane] ??= [];
    lanes[lane].push(entry);
    laneFor.set(entry.block.id, lane);
  });
  const laneCount = Math.max(lanes.length, 1);
  const minuteAt = (clientY: number, currentTarget: HTMLElement) => snap(DAY_START + ((clientY - currentTarget.getBoundingClientRect().top) / currentTarget.getBoundingClientRect().height) * (DAY_END - DAY_START));
  const finishDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawing) return;
    const end = minuteAt(event.clientY, event.currentTarget);
    const range = clampRange(drawing.start, end);
    setDrawing(null);
    onCreate(day, range.start, range.end);
  };
  const previewEntry = preview && preview.weekday === day ? { startTime: preview.startTime, endTime: preview.endTime } : null;

  return <div
    className="relative h-[720px] min-w-[132px] overflow-hidden border-l border-ink/10 bg-[#FFFDF9] first:border-l-0"
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => {
      event.preventDefault();
      const id = Number(event.dataTransfer.getData("text/weekly-block"));
      const entry = entries.find(({ block }) => block.id === id);
      if (!entry) return;
      const start = minuteAt(event.clientY, event.currentTarget);
      const duration = toMinutes(entry.block.endTime) - toMinutes(entry.block.startTime);
      const nextStart = Math.min(start, DAY_END - duration);
      onMove(id, day, nextStart, nextStart + duration);
    }}
  >
    <div
      className="absolute inset-0 cursor-crosshair touch-none"
      style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(43,41,38,.14) 0 1px, transparent 1px 60px), repeating-linear-gradient(to bottom, rgba(43,41,38,.07) 0 1px, transparent 1px 15px)" }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const start = minuteAt(event.clientY, event.currentTarget);
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrawing({ start, end: start });
      }}
      onPointerMove={(event) => { if (drawing) setDrawing({ start: drawing.start, end: minuteAt(event.clientY, event.currentTarget) }); }}
      onPointerUp={finishDrawing}
      onPointerCancel={() => setDrawing(null)}
      aria-label={"Draw a schedule block for " + WEEKDAYS[day - 1]}
    />
    {Array.from({ length: 13 }, (_, index) => <span key={index} className="pointer-events-none absolute left-2 z-[1] -translate-y-1/2 font-display text-[9px] tabular-nums text-ink/35" style={{ top: String((index / 12) * 100) + "%" }}>{index === 12 ? "19:00" : String(7 + index).padStart(2, "0") + ":00"}</span>)}
    {entries.map(({ block, member }) => {
      const lane = laneFor.get(block.id) || 0;
      return <button
        key={block.id}
        type="button"
        draggable
        onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/weekly-block", String(block.id)); }}
        onClick={() => onSelect({ block, member })}
        className="absolute z-[2] overflow-hidden rounded-[3px] border-l-[3px] px-2 py-1 text-left shadow-sm transition hover:z-10 hover:brightness-95"
        style={{ ...blockStyle(block), left: "calc(" + lane + " * (100% - 12px) / " + laneCount + " + 6px)", width: "calc((100% - 12px) / " + laneCount + " - 4px)", backgroundColor: member.color + "22", borderLeftColor: member.color }}
        title={member.fullName + ", " + formatTime(block.startTime) + "–" + formatTime(block.endTime) + ". Click to edit or drag to move."}
      ><span className="block truncate font-display text-[10px] font-extrabold">{firstName(member.fullName)}</span><span className="block truncate text-[9px] tabular-nums text-ink/60">{formatTime(block.startTime)}–{formatTime(block.endTime)}</span></button>;
    })}
    {drawing ? <div className="pointer-events-none absolute left-1/4 right-2 z-[3] rounded-[3px] border border-dashed border-coral bg-coral/20" style={{ ...blockStyle({ startTime: toTime(Math.min(drawing.start, drawing.end)), endTime: toTime(Math.max(drawing.start, drawing.end)) }), minHeight: String((SLOT / (DAY_END - DAY_START)) * 100) + "%" }} /> : null}
    {previewEntry && !drawing ? <div className="pointer-events-none absolute left-1/4 right-2 z-[3] rounded-[3px] border border-dashed border-slate bg-slate/15" style={blockStyle(previewEntry)}><span className="px-2 py-1 text-[9px] font-bold text-slate">pending save</span></div> : null}
  </div>;
}

export function AdminScheduleEditor({ today, people, blocks }: { today: string; people: PublicPerson[]; blocks: BlockEntry[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [entries, setEntries] = useState(blocks);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState("Drag across a day to add a recurring block.");
  useEffect(() => setEntries(blocks), [blocks]);

  const byDay = useMemo(() => WEEKDAYS.map((_, index) => entries.filter(({ block }) => block.weekday === index + 1)), [entries]);
  const choosePerson = people[0]?.id || 0;
  const selectEntry = ({ block }: BlockEntry) => {
    setDraft({ id: block.id, personId: block.personId, weekday: block.weekday, startTime: block.startTime.slice(0, 5), endTime: block.endTime.slice(0, 5), effectiveFrom: block.effectiveFrom });
    setMessage("Editing this recurring block. Drag it to another day or adjust the fields below.");
  };
  const createDraft = (weekday: number, start: number, end: number) => {
    const range = clampRange(start, end);
    setDraft({ personId: choosePerson, weekday, startTime: toTime(range.start), endTime: toTime(range.end), effectiveFrom: today });
    setMessage("Choose the person, then save this recurring block.");
  };
  const moveBlock = (id: number, weekday: number, start: number, end: number) => {
    const entry = entries.find(({ block }) => block.id === id);
    if (!entry) return;
    setDraft({ id, personId: entry.block.personId, weekday, startTime: toTime(start), endTime: toTime(end), effectiveFrom: entry.block.effectiveFrom });
    setMessage("Block moved. Save changes to update the weekly schedule.");
  };
  const updateDraft = (field: keyof Draft, value: string) => setDraft((current) => current ? { ...current, [field]: field === "personId" || field === "weekday" ? Number(value) : value } : current);
  const save = () => {
    if (!draft) return;
    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => formData.set(key, String(value)));
    startTransition(async () => {
      try {
        if (draft.id) await updateWeeklyBlock(formData); else await createWeeklyBlock(formData);
        setDraft(null);
        setMessage("Saved. The public schedule and weekly view are now up to date.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not save this block.");
      }
    });
  };
  const remove = () => {
    if (!draft?.id || !window.confirm("Remove this recurring schedule block?")) return;
    const formData = new FormData();
    formData.set("id", String(draft.id));
    startTransition(async () => {
      try {
        await deleteWeeklyBlock(formData);
        setDraft(null);
        setMessage("Block removed from the weekly schedule.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not remove this block.");
      }
    });
  };

  return <section className="mx-auto w-full max-w-[1280px] px-4 pb-10 sm:px-8">
    <div className="overflow-hidden border-x border-ink/20 bg-[#FFFDF9] shadow-[0_16px_50px_rgba(43,41,38,.08)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 bg-paper-deep px-5 py-6 sm:px-8"><div><p className="font-display text-[10px] font-extrabold uppercase tracking-[.18em] text-coral">Schedule controls</p><h1 className="display mt-2 text-3xl font-bold sm:text-4xl">Shape the week</h1><p className="mt-2 max-w-xl text-sm text-ink/55">Draw a time range on any day, choose the person, and save it as a recurring default schedule.</p></div><div className="text-right font-display text-[10px] font-bold uppercase tracking-[.14em] text-ink/45">15 min grid · 07:00–19:00</div></div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-x-auto p-4 sm:p-6"><div className="min-w-[940px]"><div className="grid grid-cols-7 border-y border-ink/10 bg-paper-deep">{WEEKDAYS.map((day, index) => <div key={day} className="border-l border-ink/10 px-2 py-3 text-center first:border-l-0"><span className="font-display text-[10px] font-extrabold tracking-[.16em]">{day.toUpperCase()}</span><span className="mt-1 block text-[9px] text-ink/40">{addDays(today, index)}</span></div>)}</div><div className="grid grid-cols-7">{WEEKDAYS.map((day, index) => <TimelineDay key={day} day={index + 1} entries={byDay[index]} preview={draft || undefined} onCreate={createDraft} onSelect={selectEntry} onMove={moveBlock} />)}</div></div></div>
        <aside className="border-t border-ink/10 bg-paper-deep/60 p-5 sm:p-6 lg:border-l lg:border-t-0"><div className="flex items-center justify-between"><div><p className="font-display text-[10px] font-extrabold uppercase tracking-[.16em] text-ink/45">Block details</p><p className="mt-1 text-xs text-ink/50">{draft?.id ? "Edit recurring block" : "New recurring block"}</p></div>{draft ? <button type="button" onClick={() => { setDraft(null); setMessage("Drag across a day to add a recurring block."); }} className="text-xs font-bold text-ink/45 hover:text-coral">Clear</button> : null}</div>{draft ? <div className="mt-5 space-y-4"><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="schedule-day">Day</Label><Select id="schedule-day" value={draft.weekday} onChange={(event) => updateDraft("weekday", event.target.value)}>{WEEKDAYS.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</Select></div><div><Label htmlFor="schedule-person">Person</Label><Select id="schedule-person" value={draft.personId} onChange={(event) => updateDraft("personId", event.target.value)}>{people.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</Select></div></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="schedule-start">Starts</Label><Input id="schedule-start" type="time" step={900} min="07:00" max="18:45" value={draft.startTime} onChange={(event) => updateDraft("startTime", event.target.value)} /></div><div><Label htmlFor="schedule-end">Ends</Label><Input id="schedule-end" type="time" step={900} min="07:15" max="19:00" value={draft.endTime} onChange={(event) => updateDraft("endTime", event.target.value)} /></div></div><div><Label htmlFor="schedule-effective">Effective from</Label><Input id="schedule-effective" type="date" value={draft.effectiveFrom} onChange={(event) => updateDraft("effectiveFrom", event.target.value)} /></div><div className="border-l-2 border-coral pl-3 text-xs leading-5 text-ink/60\"><strong>{WEEKDAYS[draft.weekday - 1]}</strong> · {formatTime(draft.startTime)}–{formatTime(draft.endTime)}<br />{people.find((member) => member.id === draft.personId)?.fullName || "Choose a person"}</div><div className="flex gap-2"><Button type="button" disabled={isPending || !draft.personId} onClick={save} className="flex-1 bg-slate hover:bg-ink">{isPending ? "Saving…" : draft.id ? "Save changes" : "Add block"}</Button>{draft.id ? <button type="button" disabled={isPending} onClick={remove} className="h-11 rounded-xl border border-coral/35 px-3 text-xs font-bold text-coral hover:bg-coral/10">Remove</button> : null}</div></div> : <div className="mt-5 border border-dashed border-ink/20 px-4 py-5 text-sm leading-6 text-ink/55">Click and drag in the grid to draw a block. Existing blocks can be clicked to edit or dragged to another day.</div>}<p className="mt-5 border-t border-ink/10 pt-4 text-[11px] leading-5 text-ink/45" aria-live="polite">{message}</p></aside>
      </div>
    </div>
  </section>;
}
