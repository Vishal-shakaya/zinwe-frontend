import { useEffect, useState } from "react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const dayYearFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const fullFmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** "just now", "5 min ago", "3 hours ago", "yesterday at 4:10 PM", "12 Mar". */
export function formatRelative(iso: string | null | undefined, now: number, fallback = "never"): string {
  const date = parse(iso);
  if (!date) return fallback;
  const diff = now - date.getTime();
  // A PC clock slightly ahead of ours still reads as "just now".
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < 12 * HOUR) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const label = dayLabel(date, now);
  if (label === "Today" || label === "Yesterday") return `${label.toLowerCase()} at ${timeFmt.format(date)}`;
  return label;
}

/** Full local date and time, for tooltips. */
export function formatDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? fullFmt.format(date) : "";
}

/** Local clock time, e.g. "4:10 PM". */
export function formatTime(iso: string | null | undefined): string {
  const date = parse(iso);
  return date ? timeFmt.format(date) : "";
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today", "Yesterday", "12 Mar" or "12 Mar 2025" (older years). */
export function dayLabel(date: Date, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(date.getTime())) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.getFullYear() === new Date(now).getFullYear() ? dayFmt.format(date) : dayYearFmt.format(date);
}

/** Group key + label for an ISO timestamp (local calendar day). */
export function dayGroup(iso: string, now: number): { key: string; label: string } {
  const date = parse(iso) ?? new Date(now);
  return {
    key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    label: dayLabel(date, now),
  };
}

/** Current time, refreshed every `intervalMs` so relative labels stay honest. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
