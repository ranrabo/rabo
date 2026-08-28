"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Radio } from "lucide-react";
import type { LabSession, Person, WeeklyBlock } from "@/db/schema";
import { formatTime, toMinutes } from "@/lib/utils";

type BlockWithMember = { block: WeeklyBlock; member: Person };
type SessionWithMember = { session: LabSession; member: Person };

export const NowInLab = ({ openSessions, todayBlocks, initialTime }: { openSessions: SessionWithMember[]; todayBlocks: BlockWithMember[]; initialTime: string }) => {
  const [now, setNow] = useState(initialTime);
  useEffect(() => {
    const tick = () => setNow(new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const current = useMemo(() => {
    const minute = toMinutes(now);
    const openPeople = openSessions.map(({ session, member }) => ({ member, start: session.startTime.slice(0, 5), end: "Now" }));
    const scheduled = todayBlocks
      .filter(({ block }) => toMinutes(block.startTime) <= minute && toMinutes(block.endTime) > minute)
      .map(({ block, member }) => ({ member, start: block.startTime.slice(0, 5), end: block.endTime.slice(0, 5) }));
    const byId = new Map<number, { member: Person; start: string; end: string }>();
    [...scheduled, ...openPeople].forEach((item) => byId.set(item.member.id, item));
    return Array.from(byId.values());
  }, [now, openSessions, todayBlocks]);

  return (
    <div className="mt-7">
      {current.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {current.map(({ member, start, end }) => (
            <Link href={`/people/${member.id}`} key={member.id} className="group flex items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-[0_8px_24px_rgba(16,42,51,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,42,51,.12)]">
              <span><span className="block font-bold">{member.fullName}</span><span className="mt-1 block text-xs text-ink/55">{formatTime(start)} — {end === "Now" ? "now" : formatTime(end)}</span></span>
              <ArrowRight size={18} className="text-ink/35 transition group-hover:translate-x-1 group-hover:text-coral" />
            </Link>
          ))}
        </div>
      ) : <p className="border-l-2 border-coral py-1 pl-4 text-sm font-semibold text-ink/70">No one is scheduled in the lab right now.</p>}
      <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-ink/45"><Radio size={13} className="text-coral" /> Refreshes locally every 60 seconds · lab time</p>
    </div>
  );
};
