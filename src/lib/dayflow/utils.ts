import { format, parseISO } from "date-fns";
import type { RecurringRule } from "./types";

export const todayISO = () => format(new Date(), "yyyy-MM-dd");
export const toISO = (d: Date) => format(d, "yyyy-MM-dd");
export const fromISO = (s: string) => parseISO(s);

export const minutesToLabel = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${mm.toString().padStart(2, "0")} ${period}`;
};

export const minutesToShort = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
};

export const hoursLabel = (mins: number) => {
  const h = mins / 60;
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
};

export const recurringMatches = (rule: RecurringRule | undefined, date: Date) => {
  if (!rule || rule.type === "none") return false;
  const day = date.getDay();
  if (rule.type === "daily") return true;
  if (rule.type === "weekdays") return day >= 1 && day <= 5;
  if (rule.type === "weekends") return day === 0 || day === 6;
  if (rule.type === "custom") return rule.days?.includes(day) ?? false;
  return false;
};

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Timeline window: starts at midnight, extends 4 hours past midnight to support late-night blocks.
export const TIMELINE_START = 0;
export const TIMELINE_END = 24 * 60 + 4 * 60; // 4 AM next day (1680 min)
export const MIDNIGHT = 24 * 60; // 1440 — used to render the midnight separator
export const PX_PER_MIN = 1; // 60 px / hour
