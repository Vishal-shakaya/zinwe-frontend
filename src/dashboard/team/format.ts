/**
 * Small formatters shared by Team & PCs and Today's activity, in the boards' exact shapes:
 * "9:32 AM", "4 h 08 min", "42 min", "Thu, 22 Oct", "Wednesday, 28 October 2026".
 */

const hmFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
const shortDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
const longDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dayMonthShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "9:32 AM". */
export function hm(at: string | number | Date | null | undefined): string {
  if (at === null || at === undefined) return "";
  const d = typeof at === "string" ? parse(at) : new Date(at);
  return d ? hmFmt.format(d) : "";
}

/** Minutes after midnight → "9:32 AM". */
export function hmOfMinutes(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  const d = new Date(2000, 0, 1, h, m);
  return hmFmt.format(d);
}

/** Seconds → "None" (zero), "42 min", "4 h 08 min" (the boards' fmtHM). */
export function hmDuration(seconds: number, zero = "None"): string {
  const m = Math.round(Math.max(0, seconds) / 60);
  if (!m) return zero;
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
}

/** "Thu, 22 Oct". */
export function dayShort(date: Date): string {
  return shortDay.format(date);
}

/** "Wednesday, 28 October 2026". */
export function dayLong(date: Date): string {
  return longDay.format(date);
}

/** "Monday". */
export function weekday(date: Date): string {
  return weekdayFmt.format(date);
}

/** "3 Sep 2026". */
export function dayMonthYear(iso: string | null | undefined): string {
  const d = parse(iso);
  return d ? dayMonth.format(d) : "";
}

/** "14 Oct". */
export function dayMonthOnly(date: Date): string {
  return dayMonthShort.format(date);
}

/** yyyy-mm-dd → local Date at midnight. */
export function dateOf(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** First name ("Priya Sharma" → "Priya"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/** Up to two initials. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
