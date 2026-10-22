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

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "1145.78" + INR -> "₹1,145.78"; "144.00" + USD -> "$144". Unknown/absent currency = INR. */
export function formatMoney(amount: string | number, currency: string | undefined = "INR"): string {
  if (currency !== "USD") return formatInr(amount);
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  return Number.isInteger(value) ? usdWhole.format(value) : usd.format(value);
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

/**
 * A time anyone can read (FR-10): 84 → "1 min 24 s", 2700 → "45 min", 8100 → "2 h 15 min", 0 → "0 min".
 * Seconds only under 10 minutes, where they still matter; never decimals ("1.24m" read as a time was the bug).
 */
export function friendlyDuration(seconds: number | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m === 0) return s > 0 ? `${s} s` : "0 min";
  if (m < 10 && s > 0) return `${m} min ${s} s`;
  return `${m} min`;
}

/** A chart-axis time: whole minutes under an hour, else whole or half hours ("45 min", "2 h", "1 h 30 min"). */
export function axisDuration(seconds: number): string {
  const total = Math.max(0, seconds);
  if (total < 3600) return `${Math.round(total / 60)} min`;
  const halves = Math.round(total / 1800);
  return halves % 2 ? `${(halves - 1) / 2} h 30 min` : `${halves / 2} h`;
}

/** A moment as "21 Oct, 9:05 AM" in the viewer's time zone; "" when missing. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
