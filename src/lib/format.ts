/** Money and date formatting for the portal (Indian conventions). */

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** "1999.00" -> "₹1,999"; "1999.50" -> "₹1,999.50". */
export function formatInr(amount: string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  return Number.isInteger(value) ? inrWhole.format(value) : inr.format(value);
}

export function isZero(amount: string): boolean {
  return Number(amount) === 0;
}

/** "2026-10-09" or an ISO timestamp -> "9 Oct 2026"; "" for null. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  // A bare date is a calendar day, not UTC midnight.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateFmt.format(date);
}

/** Whole days from now until `iso` (0 when past); null without a date. */
export function daysUntil(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}

/** Today as yyyy-mm-dd in local time (for <input type="date">). */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
