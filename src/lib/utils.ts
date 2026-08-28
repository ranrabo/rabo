import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const LAB_TIMEZONE = "America/New_York";
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const LONG_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export const getLabToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: LAB_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export const getLabNow = () =>
  new Intl.DateTimeFormat("en-GB", { timeZone: LAB_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());

export const toMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
};

export const formatTime = (value: string) => {
  const [hourValue, minute] = value.slice(0, 5).split(":").map(Number);
  const suffix = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: LAB_TIMEZONE, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );

export const getMonday = (dateValue: string) => {
  const date = new Date(`${dateValue}T12:00:00`);
  const day = date.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
};

export const addDays = (dateValue: string, days: number) => {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getWeekdayIndex = (dateValue: string) => {
  const day = new Date(`${dateValue}T12:00:00`).getDay();
  return day === 0 ? 6 : day - 1;
};

export const hoursBetween = (start: string, end: string | null) => {
  if (!end) return 0;
  return Math.max(0, (toMinutes(end) - toMinutes(start)) / 60);
};

export const formatHours = (hours: number) => `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)} h`;
