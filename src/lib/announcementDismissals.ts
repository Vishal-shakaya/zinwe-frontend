/**
 * Which notification bars this browser has closed, by announcement id. Shared by the dashboard's
 * NotificationBar and the website's AnnouncementBar, so closing a message in one place closes it in
 * the other. An edited message gets a new id from the backend, so it shows again.
 * Per-viewer convenience only: blocked storage just means the bar comes back.
 */
const STORAGE_KEY = "zinwe.dismissed-announcements";

export function readDismissed(): Set<string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

export function writeDismissed(ids: Set<string>): void {
  try {
    // Keep the list short: the newest 200 dismissals are plenty.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    // Private mode / blocked storage: the bar simply won't remember the dismissal.
  }
}

/** A path on this site (rendered as a router Link) rather than an outside https:// link. */
export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}
