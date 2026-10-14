/**
 * The visitor's cookie choice (Cookie Policy): essential cookies are always on; analytics only
 * with consent. Kept per browser. Anything that would set analytics cookies must check
 * `analyticsAllowed()` first. "Cookie settings" in the footer reopens the sheet.
 */
import { COOKIE_POLICY_VERSION } from "../content/legal";

const KEY = "zinwe.cookies";
export const COOKIE_SETTINGS_EVENT = "zinwe:cookie-settings";

export interface CookieChoice {
  analytics: boolean;
  /** The policy version it was given for; a new version asks again. */
  version: string;
  at: string;
}

export function readCookieChoice(): CookieChoice | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const choice = JSON.parse(raw) as CookieChoice;
    return choice.version === COOKIE_POLICY_VERSION ? choice : null;
  } catch {
    return null;
  }
}

export function saveCookieChoice(analytics: boolean): CookieChoice {
  const choice: CookieChoice = { analytics, version: COOKIE_POLICY_VERSION, at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(choice));
  } catch {
    /* storage blocked: the sheet just asks again next visit */
  }
  return choice;
}

export function analyticsAllowed(): boolean {
  return readCookieChoice()?.analytics === true;
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}
