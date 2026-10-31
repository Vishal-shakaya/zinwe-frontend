/**
 * Web push in this browser (FR-15): the service worker (public/sw.js) and this browser's subscription with the server
 * (z_devices/web_push.py). Registered from the dashboard only; here in lib because logging out, from anywhere, ends it.
 * None of this may get in the way of the dashboard: every function swallows its failures, and the poll in
 * useOwnerNotifications still shows notifications while a tab is open.
 */
import { getPushStatus, removePushSubscription, savePushSubscription } from "./api";

const UNSUBSCRIBE_WAIT_MS = 3000;

let registering: Promise<ServiceWorkerRegistration | null> | null = null;
let registration: ServiceWorkerRegistration | null = null;

async function register(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    registration = await navigator.serviceWorker.ready; // subscribing needs an active worker, not just a registered one
    return registration;
  } catch {
    return null; // http, or a private window that refuses service workers
  }
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  registering ??= register();
  return registering;
}

/** The worker, once it's active on this page. */
export function swRegistration(): ServiceWorkerRegistration | null {
  return registration;
}

function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/** Notifications can reach this browser with Zinwe closed: it can do web push, and the server has it switched on. */
export async function pushAvailable(signal?: AbortSignal): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    return (await getPushStatus(signal)).enabled;
  } catch {
    return false;
  }
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const raw = atob(base64url.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(current: ArrayBuffer | null, wanted: Uint8Array): boolean {
  if (!current || current.byteLength !== wanted.length) return false;
  const bytes = new Uint8Array(current);
  return wanted.every((b, i) => b === bytes[i]);
}

/**
 * Tell the server about this browser. Needs the permission already granted; asks for nothing. Safe to repeat: it's how
 * a new sign-in on this browser takes it over. Returns whether this browser will get pushes.
 */
export async function subscribeThisBrowser(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const { enabled, public_key: publicKey } = await getPushStatus();
    if (!enabled) return false;
    const worker = await registerServiceWorker();
    if (!worker) return false;
    const key = keyBytes(publicKey);
    let subscription = await worker.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
      await subscription.unsubscribe(); // the server's keys changed: the browser refuses a second key until then
      subscription = null;
    }
    subscription ??= await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await savePushSubscription(subscription.toJSON());
    return true;
  } catch {
    return false; // Brave with Google push off, offline, ...: this browser just stays on the poll
  }
}

async function dropSubscription(): Promise<void> {
  try {
    const worker = registration ?? (await navigator.serviceWorker.getRegistration());
    const subscription = await worker?.pushManager.getSubscription();
    if (!subscription) return;
    // The browser's side comes off whatever the server says: the next push to the old address then gets a 410.
    await removePushSubscription(subscription.endpoint, AbortSignal.timeout(UNSUBSCRIBE_WAIT_MS)).catch(() => null);
    await subscription.unsubscribe();
  } catch {
    // Nothing more to do from here.
  }
}

/** This browser stops getting pushes. Needs the sign-in, so log out calls it first; it can't hold logging out up. */
export async function unsubscribeThisBrowser(): Promise<void> {
  if (!pushSupported()) return;
  await Promise.race([
    dropSubscription(),
    new Promise<void>((resolve) => window.setTimeout(resolve, UNSUBSCRIBE_WAIT_MS)),
  ]);
}
