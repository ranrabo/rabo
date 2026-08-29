import { LogOut } from "lucide-react";
import { endAdminSession } from "@/app/admin/actions";
import { AdminIdleLogout } from "@/components/admin-idle-logout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-mode-shell"><header className="admin-mode-note"><div><span className="admin-mode-label">Admin mode</span><span className="admin-mode-copy">Signs out to the public board after 30 minutes idle.</span></div><form action={endAdminSession}><button type="submit" className="admin-mode-signout"><LogOut size={14} /> Log out</button></form></header><AdminIdleLogout action={endAdminSession} />{children}</div>;
}
