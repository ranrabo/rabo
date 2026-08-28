import Link from "next/link";
import { FileBarChart, LogOut, Radio } from "lucide-react";
import { auth, signOut } from "@/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  return <div className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 py-6"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-coral">Private workspace</p><h1 className="display mt-1 text-3xl font-bold">Room log</h1></div><div className="flex items-center gap-4 text-sm font-bold"><Link href="/admin" className="flex items-center gap-2 text-ink/65 hover:text-ink"><Radio size={16} /> Log</Link><Link href="/admin/report" className="flex items-center gap-2 text-ink/65 hover:text-ink"><FileBarChart size={16} /> Report</Link><form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="flex items-center gap-2 text-ink/45 hover:text-coral" type="submit"><LogOut size={16} /> <span className="hidden sm:inline">Sign out</span></button></form></div></div><div className="py-8">{children}</div><p className="border-t border-ink/15 pt-5 text-xs font-semibold text-ink/40">Signed in as {session?.user?.name || "Admin"} · room occupancy only</p></div>;
}
