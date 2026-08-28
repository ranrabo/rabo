import Link from "next/link";
import { ArrowUpRight, CircleDot } from "lucide-react";

export const Header = () => (
  <header className="border-b border-ink/15 bg-paper">
    <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
      <Link href="/" className="group flex items-center gap-3" aria-label="rabo home">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate text-aqua"><CircleDot size={18} strokeWidth={2.5} /></span>
        <span className="display text-xl font-bold tracking-[-.06em]">rabo<span className="text-coral">/</span>lab</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm font-semibold text-ink/65 sm:gap-6">
        <Link href="/" className="hidden transition hover:text-ink sm:block">Schedule</Link>
        <Link href="/admin" className="group flex items-center gap-1 rounded-full border border-ink/20 px-3 py-2 transition hover:border-ink hover:bg-white">Admin <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
      </nav>
    </div>
  </header>
);
