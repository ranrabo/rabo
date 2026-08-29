import Link from "next/link";
import { ArrowLeft, KeyRound, LockKeyhole } from "lucide-react";
import { count } from "drizzle-orm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { getLabToday } from "@/lib/utils";
import { quoteForDate } from "@/lib/quotes";
import { authenticate, createFirstUser } from "./actions";

const HOURS = ["6", "9", "12", "15", "18", "21"];
const FIELD = "rounded-none border-0 border-b border-ink/30 bg-transparent px-1 focus:border-slate focus:ring-0";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ setup?: string }> }) {
  const [{ userCount }] = await db.select({ userCount: count() }).from(appUser);
  const isFirstUse = userCount === 0;
  const params = searchParams ? await searchParams : {};
  const setupComplete = params.setup === "complete";
  const setupError = params.setup === "error";

  const today = new Date(`${getLabToday()}T12:00:00`);
  const quote = quoteForDate(today);
  const month = today.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const weekdayShort = today.toLocaleString("en-US", { weekday: "short" }).toUpperCase();
  const weekdayKanji = ["日", "月", "火", "水", "木", "金", "土"][today.getDay()];
  const dayOfYear = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(today.getFullYear(), 0, 0)) / 86_400_000);

  return <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-paper px-5 py-14 sm:px-8">
    <div className="techo-sheet techo-grid w-full min-w-0 max-w-[400px] -rotate-[0.7deg] border border-ink/10 pb-7 pl-6 pr-7 pt-6 sm:pl-7">
      {/* date header — Hobonichi day box */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-stretch overflow-hidden border border-ink/25 font-display leading-none text-slate">
        <div className="flex items-center justify-center border-r border-ink/25 px-3 py-3 text-[13px] font-bold tracking-[.1em]">{month}</div>
        <div className="flex min-w-0 items-center justify-center px-2 py-2 text-[3.25rem] font-extrabold tracking-[-.08em]">{today.getDate()}</div>
        <div className="flex flex-col items-center justify-center gap-1 bg-slate/10 px-3 py-2">
          <span className="text-xl font-extrabold">{weekdayKanji}</span>
          <span className="text-[10px] font-extrabold tracking-[.18em]">{weekdayShort}</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 border-l border-ink/25 px-2.5 py-2 text-ink/45">
          <span className="text-sm leading-none" aria-hidden="true">◐</span>
          <span className="font-display text-[10px] font-bold tabular-nums">{dayOfYear}</span>
        </div>
      </div>
      <p className="mt-1.5 border-b border-ink/15 pb-2 font-display text-[10px] font-medium tracking-[.14em] text-ink/40">RABO ・ ランラボ ・ ROOM LOG</p>

      {/* body — hour rail + sign-in */}
      <div className="mt-5 flex gap-4">
        <div className="flex w-5 shrink-0 flex-col justify-between border-r border-ink/20 pb-2 pt-1 font-display text-[9px] font-medium tabular-nums text-ink/35">
          {HOURS.map((h) => <span key={h} className="-ml-px leading-none">{h}</span>)}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <p className="font-display text-[10px] font-bold uppercase tracking-[.2em] text-coral">Admin access</p>
          {isFirstUse ? <>
            <h1 className="display mt-2 text-2xl font-bold leading-tight">Set up ranrabo</h1>
            <p className="mt-2 text-[13px] leading-6 text-ink/55">First visit — choose a password for the private room log.</p>
            {setupError && <p className="mt-4 border-l-2 border-coral bg-coral/10 px-3 py-2 text-[13px] font-bold text-coral">Use at least 12 characters and make both passwords match.</p>}
            <form action={createFirstUser} className="mt-5 space-y-4">
              <div><Label htmlFor="setup-username">Username</Label><Input id="setup-username" value="ranrabo" readOnly className={FIELD} /></div>
              <div><Label htmlFor="setup-password">Password</Label><Input id="setup-password" name="password" type="password" autoComplete="new-password" minLength={12} required className={FIELD} /></div>
              <div><Label htmlFor="confirmation">Confirm password</Label><Input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} required className={FIELD} /></div>
              <Button type="submit" className="mt-1 w-full bg-slate hover:bg-ink"><KeyRound size={16} /> Create private account</Button>
            </form>
          </> : <>
            <h1 className="display mt-2 text-2xl font-bold leading-tight">Sign in</h1>
            <p className="mt-2 text-[13px] leading-6 text-ink/55">Enter the shared admin credentials.</p>
            {setupComplete && <p className="mt-4 border-l-2 border-slate bg-slate/10 px-3 py-2 text-[13px] font-bold text-slate">Account ready — sign in below.</p>}
            <form action={authenticate} className="mt-5 space-y-4">
              <div><Label htmlFor="identifier">Username or email</Label><Input id="identifier" name="identifier" type="text" autoComplete="username" required className={FIELD} /></div>
              <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required className={FIELD} /></div>
              <Button type="submit" className="mt-1 w-full bg-slate hover:bg-ink"><LockKeyhole size={16} /> Enter admin</Button>
            </form>
          </>}
          <Link href="/" className="mt-5 inline-flex items-center gap-2 text-[12px] font-bold text-ink/45 transition hover:text-coral"><ArrowLeft size={14} /> Back to public schedule</Link>
        </div>
      </div>

      {/* Hobonichi daily quote */}
      <figure className="mt-6 max-w-[300px] border-t border-ink/15 pt-3">
        <blockquote className="font-display text-[11px] font-medium leading-[1.55] text-ink/55">{quote.text}</blockquote>
        <figcaption className="mt-2 font-display text-[10px] font-bold tracking-[.06em] text-ink/40">— {quote.source}</figcaption>
      </figure>

      {/* month tab */}
      <span className="absolute right-0 bottom-[74px] flex h-9 w-9 items-center justify-center bg-slate font-display text-lg font-extrabold text-paper-deep" aria-hidden="true">{today.getMonth() + 1}</span>
    </div>
  </div>;
}
