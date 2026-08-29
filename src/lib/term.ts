import { addDays } from "@/lib/utils";

// The lab's term calendar. These windows are the *default* — outside them (and
// on the holidays below) nobody is scheduled automatically, but an admin can
// still add hours for a specific day on purpose.
export const TERM_SEGMENTS = [
  { from: "2026-08-26", to: "2026-12-13" }, // fall term
  { from: "2027-01-24", to: "2027-05-10" }, // spring term, after the winter break
] as const;

const TERM_START = TERM_SEGMENTS[0].from;
const TERM_END = TERM_SEGMENTS[TERM_SEGMENTS.length - 1].to;
const BREAK_START = addDays(TERM_SEGMENTS[0].to, 1); // first day of winter break
const BREAK_END = addDays(TERM_SEGMENTS[1].from, -1); // last day of winter break

// Days inside a term when the lab is closed by default (holidays / short breaks).
export const NO_LAB_DATES: Record<string, string> = {
  "2026-09-07": "Labor Day",
  "2026-10-08": "fall break",
  "2026-10-09": "fall break",
  "2026-11-25": "Thanksgiving",
  "2026-11-26": "Thanksgiving",
  "2026-11-27": "Thanksgiving",
};

// Days the lab runs remotely — showing up in person is optional.
export const REMOTE_DATES: Record<string, string> = {
  "2026-11-23": "remote day",
  "2026-11-24": "remote day",
};

export type LabStatus = "in" | "remote" | "off";

// `date` is a YYYY-MM-DD string; lexical comparison is correct for that format.
export const isTermDate = (date: string) =>
  TERM_SEGMENTS.some((segment) => date >= segment.from && date <= segment.to);

export const isTermOver = (date: string) => date > TERM_END;

// Short phrase for why a day is closed, for error copy and UI hints.
export const outOfTermReason = (date: string) => {
  if (date < TERM_START) return `before the term starts on ${TERM_START}`;
  if (date > TERM_END) return `after the term ends on ${TERM_END}`;
  return `during the winter break (${BREAK_START} – ${BREAK_END})`;
};

export const labStatusFor = (date: string): { status: LabStatus; reason: string } => {
  if (date in REMOTE_DATES) return { status: "remote", reason: REMOTE_DATES[date] };
  if (date in NO_LAB_DATES) return { status: "off", reason: NO_LAB_DATES[date] };
  if (!isTermDate(date)) return { status: "off", reason: outOfTermReason(date) };
  return { status: "in", reason: "" };
};

// A day that counts toward the schedule (in person or remote).
export const isLabDate = (date: string) => labStatusFor(date).status !== "off";

// Term segments a recurring slot should still cover, given today. Each is clamped
// so it never starts before today, and fully-past segments are dropped.
export const upcomingTermSegments = (today: string) =>
  TERM_SEGMENTS.filter((segment) => segment.to >= today).map((segment) => ({
    from: segment.from < today ? today : segment.from,
    to: segment.to,
  }));
