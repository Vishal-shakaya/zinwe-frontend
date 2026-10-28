/**
 * CompOfferBar: a plan nudge's × says "Hide for 7 days" (it comes back sooner only if something changes: a changed
 * message gets a new id). Per-viewer convenience on this browser; blocked storage just means the bar comes back.
 * Announcements are hidden for good through lib/announcementDismissals (shared with the website's bar).
 */
const KEY = "zinwe.bars.snoozed";
const WEEK_MS = 7 * 86_400_000;

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as unknown) : {};
    return data && typeof data === "object" ? (data as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, number>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* blocked storage: the bar shows again next visit */
  }
}

/** Ids hidden right now (expired snoozes are dropped). */
export function readSnoozed(now: number): Set<string> {
  const map = read();
  const live = Object.entries(map).filter(([, until]) => typeof until === "number" && until > now);
  if (live.length !== Object.keys(map).length) write(Object.fromEntries(live));
  return new Set(live.map(([id]) => id));
}

export function snooze(id: string, now: number): void {
  write({ ...read(), [id]: now + WEEK_MS });
}

export function unsnooze(id: string): void {
  const map = read();
  delete map[id];
  write(map);
}
