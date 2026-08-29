import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { person } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await db.query.person.findFirst({
    columns: { id: true, fullName: true, researchArea: true, active: true, color: true },
    where: eq(person.id, Number(id)),
  });
  if (!member || !member.active) notFound();
  const hue = member.color;
  return <div className="min-h-screen bg-paper px-4 pb-12 pt-4 sm:px-8 sm:pt-8"><div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1200px] flex-col border border-ink/20 bg-[#FFFDF9] bg-[linear-gradient(to_right,#EAEAEA_1px,transparent_1px),linear-gradient(to_bottom,#EAEAEA_1px,transparent_1px)] bg-[size:26px_26px]"><header className="flex items-center justify-between border-b border-ink/20 bg-paper-deep px-5 py-4 sm:px-12 sm:py-5"><Link href="/" className="inline-flex items-center gap-2 font-display text-xs font-bold tracking-[.14em] text-slate transition hover:text-coral"><ArrowLeft size={15} /> BACK TO THE BOARD</Link><span className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: hue }} /></header><main className="flex flex-1 flex-col justify-center px-5 py-20 sm:px-12"><h1 className="max-w-5xl font-display text-[clamp(3.4rem,10vw,7rem)] font-extrabold leading-[.92] tracking-[-.06em]">{member.fullName}</h1><div className="my-8 h-[3px] max-w-[620px]" style={{ backgroundColor: hue }} /><p className="max-w-2xl text-xl leading-8 tracking-[-.01em] text-ink/75 sm:text-2xl">{member.researchArea}</p></main><footer className="border-t border-ink/20 bg-paper-deep px-5 py-4 font-display text-[10px] font-medium tracking-[.14em] text-ink/50 sm:px-12">RABO.YANGRAN.ORG</footer></div></div>;
}
