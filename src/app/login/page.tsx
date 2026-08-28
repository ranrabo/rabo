import Link from "next/link";
import { ArrowLeft, CircleDot, LockKeyhole } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authenticate } from "./actions";

export default function LoginPage() {
  return <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1200px] items-center justify-center px-5 py-12 sm:px-8"><div className="grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-ink/15 bg-white shadow-[0_24px_70px_rgba(16,42,51,.1)] md:grid-cols-[.9fr_1.1fr]"><div className="grid-paper bg-slate p-8 text-paper sm:p-12"><CircleDot className="text-aqua" size={28} /><p className="mt-16 text-[11px] font-bold uppercase tracking-[.18em] text-aqua">Private side</p><h1 className="display mt-3 text-5xl font-bold leading-none">Back to<br />the room.</h1><p className="mt-6 max-w-xs text-sm leading-6 text-paper/60">For the people who keep the shared schedule moving.</p></div><div className="p-8 sm:p-12"><p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral">Admin access</p><h2 className="display mt-3 text-3xl font-bold">Sign in</h2><form action={authenticate} className="mt-8 space-y-5"><div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div><Button type="submit" className="mt-2 w-full"><LockKeyhole size={16} /> Enter admin</Button></form><Link href="/" className="mt-7 flex items-center gap-2 text-sm font-bold text-ink/50 hover:text-coral"><ArrowLeft size={15} /> Back to public schedule</Link></div></div></div>;
}
