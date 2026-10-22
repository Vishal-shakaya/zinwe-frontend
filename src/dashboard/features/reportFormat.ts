/** Small formatters for the Reports page (FR-22). */

/** Minutes after midnight as "9:30 AM"; "—" when unknown. */
export function clockOf(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "2026-10-21" as "Wed 21 Oct". */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** A local hour (0-23) as "9 AM". */
export function hourLabel(hour: number): string {
  return `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`;
}

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** "a@b.com, c@d.in" → ["a@b.com", "c@d.in"] (trimmed, lower-cased, unique). */
export function parseEmails(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const email = raw.trim().toLowerCase();
    if (email && !out.includes(email)) out.push(email);
  }
  return out;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The first address that doesn't look like an email, or null. */
export function badEmail(emails: string[]): string | null {
  return emails.find((e) => !EMAIL.test(e)) ?? null;
}
