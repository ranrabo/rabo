import { addDays } from "./utils";

// A range can overlap a week without including this block's weekday.
export function occursInWeek(
  block: { weekday: number; effectiveFrom: string; effectiveTo: string | null },
  monday: string,
) {
  const date = addDays(monday, block.weekday - 1);
  return block.effectiveFrom <= date && (block.effectiveTo === null || date <= block.effectiveTo);
}
