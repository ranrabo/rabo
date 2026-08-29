import type { AdminLog as AdminLogRow } from "@/db/schema";
import { LAB_TIMEZONE } from "@/lib/utils";

const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: LAB_TIMEZONE, weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: LAB_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });

// Plain-text weekly activity trail. Collapsed by default in the admin header.
export function AdminLog({ rows }: { rows: AdminLogRow[] }) {
  if (!rows.length) {
    return <div className="admin-log"><p className="admin-log-empty">System log · no activity in the last 7 days</p></div>;
  }

  const groups: { day: string; items: AdminLogRow[] }[] = [];
  for (const row of rows) {
    const day = dayFmt.format(row.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(row);
    else groups.push({ day, items: [row] });
  }
  const range = `${dayFmt.format(rows[rows.length - 1].createdAt)} – ${dayFmt.format(rows[0].createdAt)}`;

  return <details className="admin-log">
    <summary className="admin-log-summary">System log · {range} · {rows.length} {rows.length === 1 ? "entry" : "entries"}</summary>
    <div className="admin-log-body">
      {groups.map(({ day, items }) => <div key={day} className="admin-log-group">
        <p className="admin-log-day">{day}</p>
        {items.map((row) => <p key={row.id} className="admin-log-line">
          <span className="admin-log-time">{timeFmt.format(row.createdAt)}</span>
          <span className="admin-log-actor">{row.actor}</span>
          <span className="admin-log-what">{row.detail || row.action}</span>
        </p>)}
      </div>)}
    </div>
  </details>;
}
