/**
 * The floating Support button: shown by default (a new owner sees it from their first visit), hidden
 * once the owner closes it with its ×. Support is always one tap away in the account menu, which
 * opens the same conversation panel. The choice is remembered per account on this browser.
 */

/** The account menu asks the Support widget to open with this event. */
export const SUPPORT_OPEN_EVENT = "zinwe:support";

export function openSupport(): void {
  window.dispatchEvent(new Event(SUPPORT_OPEN_EVENT));
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
