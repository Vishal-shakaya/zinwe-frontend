/**
 * The floating Support button (board DashFloat): shown by default (a new owner sees it from their first visit),
 * hidden once the owner closes it with its ×. Help & support brings it back ("Hid the Support button? Show it
 * again", board DashHelp) and can open the same conversation panel. The choice is remembered per account on
 * this browser.
 */

/** Help & support (or anything else) asks the Support widget to open with this event. */
export const SUPPORT_OPEN_EVENT = "zinwe:support";

/** Help & support → "Show it again" asks the hidden Support button to come back with this event. */
export const SUPPORT_SHOW_EVENT = "zinwe-show-support";

export function openSupport(): void {
  window.dispatchEvent(new Event(SUPPORT_OPEN_EVENT));
}

/** Bring the Support button back (DashHelp `showSupportBtn`); the widget forgets the account's "hidden" choice. */
export function showSupportButton(): void {
  window.dispatchEvent(new Event(SUPPORT_SHOW_EVENT));
}

const key = (userId: number) => `zinwe.support.fabHidden.${userId}`;

export function readFabHidden(userId: number | undefined): boolean {
  if (userId === undefined) return false;
  try {
    return localStorage.getItem(key(userId)) === "1";
  } catch {
    return false;
  }
}

export function writeFabHidden(userId: number | undefined, hidden: boolean): void {
  if (userId === undefined) return;
  try {
    if (hidden) localStorage.setItem(key(userId), "1");
    else localStorage.removeItem(key(userId));
  } catch {
    /* storage blocked: the button shows again next visit, harmless */
  }
}
