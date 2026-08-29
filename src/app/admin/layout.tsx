import { LogOut } from "lucide-react";
import { signOut } from "@/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-mode-shell"><header className="admin-mode-note"><div><span className="admin-mode-label">Admin mode</span><span className="admin-mode-copy">Make your updates, then log out when you’re done.</span></div><form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button type="submit" className="admin-mode-signout"><LogOut size={14} /> Log out</button></form></header>{children}</div>;
}
