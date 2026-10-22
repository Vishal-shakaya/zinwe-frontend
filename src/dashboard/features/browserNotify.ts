/**
 * Browser notifications for the owner (FR-15): permission, the per-browser on/off switch, and showing one.
 * The server decides what's news (getOwnerFeed + NotificationPrefs); this file only talks to the browser.
 */

const SWITCH_KEY = "zinwe.notify.browser";

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

export function setBrowserNotify(on: boolean): void {
  try {
    localStorage.setItem(SWITCH_KEY, on ? "on" : "off");
  } catch {
    // private window: the browser permission alone decides
  }
}

/** Ask the browser (must be called from a click). Resolves to the new permission. */
export async function askNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === "unsupported") return "unsupported";
  const result = await Notification.requestPermission();
  if (result === "granted") setBrowserNotify(true);
  return result;
}

/** Show one notification; a click brings the dashboard to the front and runs `onOpen`. */
export function showNotification(title: string, body: string, tag: string, onOpen?: () => void): void {
  if (!browserNotifyOn()) return;
  try {
    const n = new Notification(title, { body, tag, icon: "/favicon-32x32.png" });
    n.onclick = () => {
      window.focus();
      onOpen?.();
      n.close();
    };
  } catch {
    // Some browsers (Android Chrome) only allow notifications from a service worker: skip quietly.
  }
}
