/**
 * SAMPLE (v1.3 board DashSettings): the two Settings pieces the API does not serve yet.
 * - "Where you're signed in": no sessions API, so only this browser is listed (described from its user agent).
 *   Never invents other devices: a made-up sign-in would alarm a real owner.
 * - "Daily email summary" switch on Notifications: no preference field yet; kept for this tab like a server would.
 * When the endpoints ship, the loader bodies become the API calls and the pages don't change.
 */
import { sample, sampleStore } from "./index";

export interface SignedInSession {
  id: string;
  /** "Chrome on Windows". */
  device: string;
  /** "Active now". */
  where: string;
  /** This browser. */
  current: boolean;
}

function describeBrowser(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "A browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

/** GET (future) auth/sessions/: where the owner is signed in. */
export function listSessions(signal?: AbortSignal): Promise<SignedInSession[]> {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return sample([{ id: "this", device: describeBrowser(ua), where: "Active now", current: true }], signal);
}

export interface NotifyExtras {
  /** One email at 7 PM with the day's alerts and hours. */
  digest: boolean;
}

const extras = sampleStore<NotifyExtras>("notifyExtras", () => ({ digest: true }));

/** GET (future) notifications/settings/ `digest`. */
export function getNotifyExtras(signal?: AbortSignal): Promise<NotifyExtras> {
  return sample(extras.get(), signal);
}

/** PATCH (future) notifications/settings/ `digest`. */
export function saveNotifyExtras(patch: Partial<NotifyExtras>): Promise<NotifyExtras> {
  const next = { ...extras.get(), ...patch };
  extras.set(next);
  return sample(next, undefined, 120);
}
