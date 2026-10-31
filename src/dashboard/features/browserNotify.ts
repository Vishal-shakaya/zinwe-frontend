/**
 * Browser notifications for the owner (FR-15): permission, the per-browser on/off switch, and showing one.
 * The server decides what's news (getOwnerFeed + NotificationPrefs, and web push through the same items); this file
 * only talks to the browser. The subscription itself is in lib/webPush.
 */
import { registerServiceWorker, subscribeThisBrowser, swRegistration, unsubscribeThisBrowser } from "../../lib/webPush";

const SWITCH_KEY = "zinwe.notify.browser";
const PROMPT_KEY = "zinwe.notify.prompt";
const ICON = "/icon-192.png";

export type NotifyPermission = "granted" | "denied" | "default" | "unsupported";

export function notifyPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/** This browser shows notifications: the owner turned them on here and the browser allows it. */
export function browserNotifyOn(): boolean {
  if (notifyPermission() !== "granted") return false;
  try {
    return localStorage.getItem(SWITCH_KEY) !== "off";
  } catch {
    return true;
  }
}

/**
 * The owner switched notifications off in Settings → Notifications on this browser (CompNotify "In the browser tab":
 * then the tab shows no count and no dot). Unlike browserNotifyOn, the browser's permission doesn't matter here.
 */
export function browserNotifySwitchedOff(): boolean {
  try {
    return localStorage.getItem(SWITCH_KEY) === "off";
  } catch {
    return false;
  }
}

export function setBrowserNotify(on: boolean): void {
  try {
    localStorage.setItem(SWITCH_KEY, on ? "on" : "off");
  } catch {
    // private window: the browser permission alone decides
  }
  window.dispatchEvent(new Event(NOTIFY_SWITCH_EVENT));
}

/** Fired when the switch or the permission changes, so the tab count, the banner and Settings follow straight away. */
export const NOTIFY_SWITCH_EVENT = "zinwe:notify-switch";

/** Ask the browser (must be called from a click). Resolves to the new permission. */
export async function askNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === "unsupported") return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") setBrowserNotify(true);
  else window.dispatchEvent(new Event(NOTIFY_SWITCH_EVENT));
  return result;
}

/** "Turn on" (must be called from a click): the browser's question if it hasn't been answered, then web push here. */
export async function turnOnHere(): Promise<NotifyPermission> {
  const result = notifyPermission() === "granted" ? "granted" : await askNotifyPermission();
  if (result === "granted") {
    setBrowserNotify(true);
    void subscribeThisBrowser();
  }
  return result;
}

/** "Turn off here": no in-tab notifications and no pushes in this browser. Other browsers keep theirs. */
export function turnOffHere(): void {
  setBrowserNotify(false);
  void unsubscribeThisBrowser();
}

/** The dashboard opened: the service worker, and web push if this browser already said yes (never asks). */
export async function startBrowserNotify(): Promise<void> {
  await registerServiceWorker();
  if (browserNotifyOn()) await subscribeThisBrowser();
}

/** The owner said "Not now" on the banner in this browser (Settings → Notifications can still turn it on). */
export function notifyPromptDismissed(): boolean {
  try {
    return localStorage.getItem(PROMPT_KEY) === "dismissed";
  } catch {
    return false;
  }
}

export function dismissNotifyPrompt(): void {
  try {
    localStorage.setItem(PROMPT_KEY, "dismissed");
  } catch {
    // private window: it shows again next visit, harmless
  }
}

/** iPhone or iPad not running Zinwe from the Home Screen: Apple only gives notifications to an installed web app. */
export function needsHomeScreen(): boolean {
  const apple = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return apple && !window.matchMedia("(display-mode: standalone)").matches;
}

function showInPage(title: string, body: string, tag: string, onOpen?: () => void): void {
  try {
    const n = new Notification(title, { body, tag, icon: ICON });
    n.onclick = () => {
      window.focus();
      onOpen?.();
      n.close();
    };
  } catch {
    // Some browsers (Android Chrome) only allow notifications from a service worker: skip quietly.
  }
}

/**
 * Show one notification; a click brings the dashboard to the front and opens `link`. `tag` is the feed item's id, the
 * same as a push of it, so the browser shows one. Through the service worker when it's running, the only way on Android
 * (there sw.js handles the click); `onOpen` is for the in-page fallback.
 */
export function showNotification(title: string, body: string, tag: string, link?: string, onOpen?: () => void): void {
  if (!browserNotifyOn()) return;
  const worker = swRegistration();
  if (!worker) {
    showInPage(title, body, tag, onOpen);
    return;
  }
  worker.showNotification(title, { body, tag, icon: ICON, data: { link } }).catch(() => showInPage(title, body, tag, onOpen));
}
