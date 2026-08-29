import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const Header = () => (
  <header className="border-b border-ink/20 bg-paper-deep">
    <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
      <Link href="/" className="group flex items-end gap-3" aria-label="rabo home">
        <span className="display text-2xl font-extrabold tracking-[-.06em]">RABO</span>
        <span className="text-sm font-medium tracking-[.16em] text-ink/55">ランラボ</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm font-semibold text-ink/65 sm:gap-6">
        <Link href="/" className="hidden transition hover:text-ink sm:block">Schedule</Link>
        <Link href="/admin" className="group flex items-center gap-1 rounded border border-ink/35 px-3 py-2 transition hover:border-ink hover:bg-white/50">Admin <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
      </nav>
    </div>
  </header>
);
