import Link from "next/link";
import { ArrowLeft, Beaker } from "lucide-react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { person } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await db.query.person.findFirst({ where: eq(person.id, Number(id)) });
  if (!member || !member.active) notFound();
  return <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-20"><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink/50 hover:text-coral"><ArrowLeft size={16} /> Back to schedule</Link><div className="mt-16 max-w-2xl"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-aqua"><Beaker size={26} /></div><p className="mt-8 text-[11px] font-bold uppercase tracking-[.18em] text-coral">Research group</p><h1 className="display mt-3 text-[clamp(3.2rem,9vw,7rem)] font-bold leading-[.9]">{member.fullName}</h1><p className="mt-8 max-w-lg text-xl leading-8 text-ink/65">{member.researchArea}</p></div></div>;
}
