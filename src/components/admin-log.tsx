import type { AdminLog as AdminLogRow } from "@/db/schema";
import { addDays, getMonday, LAB_TIMEZONE } from "@/lib/utils";

const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: LAB_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: LAB_TIMEZONE, weekday: "short", month: "short", day: "numeric" });
const spanFmt = new Intl.DateTimeFormat("en-US", { timeZone: LAB_TIMEZONE, month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: LAB_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });

const plural = (n: number) => (n === 1 ? "entry" : "entries");

type DayGroup = { key: string; label: string; items: AdminLogRow[] };
type WeekGroup = { key: string; label: string; count: number; days: DayGroup[] };

// Plain-text activity trail, collapsed by default in the admin header. Rows come
// newest-first; they nest into week groups, each holding day groups, each holding
// the individual lines — so a long trail folds down to a few clasped headers.
export function AdminLog({ rows }: { rows: AdminLogRow[] }) {
  if (!rows.length) {
    return <div className="admin-log"><p className="admin-log-empty">System log · no activity in the last 7 days</p></div>;
  }

  const weeks: WeekGroup[] = [];
  for (const row of rows) {
    const iso = isoFmt.format(row.createdAt);
    const monday = getMonday(iso);
    let week = weeks[weeks.length - 1];
    if (!week || week.key !== monday) {
      week = { key: monday, label: `${spanFmt.format(new Date(`${monday}T12:00:00`))} – ${spanFmt.format(new Date(`${addDays(monday, 6)}T12:00:00`))}`, count: 0, days: [] };
      weeks.push(week);
    }
    week.count += 1;
    const day = week.days[week.days.length - 1];
    if (day && day.key === iso) day.items.push(row);
    else week.days.push({ key: iso, label: dayFmt.format(row.createdAt), items: [row] });
  }

  const range = `${dayFmt.format(rows[rows.length - 1].createdAt)} – ${dayFmt.format(rows[0].createdAt)}`;

  return <details className="admin-log">
    <summary className="admin-log-summary">System log · {range} · {rows.length} {plural(rows.length)}</summary>
    <div className="admin-log-body">
      {weeks.map((week, wi) => <details key={week.key} className="admin-log-week" open={wi === 0}>
        <summary className="admin-log-week-summary">Week of {week.label} · {week.count} {plural(week.count)}</summary>
        {week.days.map((day, di) => <details key={day.key} className="admin-log-daygroup" open={wi === 0 && di === 0}>
          <summary className="admin-log-day-summary">{day.label} · {day.items.length} {plural(day.items.length)}</summary>
          {day.items.map((row) => <p key={row.id} className="admin-log-line">
            <span className="admin-log-time">{timeFmt.format(row.createdAt)}</span>
            <span className="admin-log-actor">{row.actor}</span>
            <span className="admin-log-what">{row.detail || row.action}</span>
          </p>)}
        </details>)}
      </details>)}
    </div>
  </details>;
}
