import { addDays } from "@/lib/utils";

// The lab's term calendar. Nobody is scheduled outside these windows — enforced
// on the board (out-of-term days render empty and can't be drawn on) and in
// every schedule mutation (drag-create, block edits, and the admin control box).
export const TERM_SEGMENTS = [
  { from: "2026-08-26", to: "2026-12-13" }, // fall term
  { from: "2027-01-24", to: "2027-05-10" }, // spring term, after the winter break
] as const;

const TERM_START = TERM_SEGMENTS[0].from;
const TERM_END = TERM_SEGMENTS[TERM_SEGMENTS.length - 1].to;
const BREAK_START = addDays(TERM_SEGMENTS[0].to, 1); // first day of winter break
const BREAK_END = addDays(TERM_SEGMENTS[1].from, -1); // last day of winter break

// `date` is a YYYY-MM-DD string; lexical comparison is correct for that format.
export const isTermDate = (date: string) =>
  TERM_SEGMENTS.some((segment) => date >= segment.from && date <= segment.to);

export const isTermOver = (date: string) => date > TERM_END;

// Short phrase for "why can't I schedule this day", for error copy and UI hints.
export const outOfTermReason = (date: string) => {
  if (date < TERM_START) return `before the term starts on ${TERM_START}`;
  if (date > TERM_END) return `after the term ends on ${TERM_END}`;
  return `during the winter break (${BREAK_START} – ${BREAK_END})`;
};

// Term segments a recurring slot should still cover, given today. Each is clamped
// so it never starts before today, and fully-past segments are dropped.
export const upcomingTermSegments = (today: string) =>
  TERM_SEGMENTS.filter((segment) => segment.to >= today).map((segment) => ({
    from: segment.from < today ? today : segment.from,
    to: segment.to,
  }));
