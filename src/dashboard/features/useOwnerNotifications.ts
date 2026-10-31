import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOwnerFeed } from "../../lib/api";
import { browserNotifyOn, browserNotifySwitchedOff, NOTIFY_SWITCH_EVENT, showNotification, startBrowserNotify } from "./browserNotify";

const POLL_MS = 30_000;

/**
 * FR-15: while the dashboard is open (even in a background tab), ask every 30 s what's new — member replies,
 * alerts, requests waiting for the owner's OK — and show each as a browser notification. Clicking one opens the
 * right page. Shows nothing until notifications are switched on (the banner, or Settings → Notifications).
 *
 * It also starts the service worker and keeps this browser subscribed to web push, which brings the same items the
 * moment they happen, with the dashboard closed. Each has the feed item's id as its tag, so the poll replaces a push
 * rather than adding a second one; sw.js tells this tab the id too, so one swiped away doesn't come back.
 */
export function useOwnerNotifications(enabled: boolean): void {
  const navigate = useNavigate();
  const since = useRef<string | null>(null);
  const shown = useRef(new Set<string>());

  useEffect(() => {
    if (enabled) void startBrowserNotify();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    const fromWorker = (event: MessageEvent<{ type?: string; id?: string; link?: string }>) => {
      const { type, id, link } = event.data ?? {};
      if (type === "zinwe-push" && id) shown.current.add(id);
      if (type === "zinwe-open" && link) navigate(link); // a click on a notification (sw.js focused this tab)
    };
    navigator.serviceWorker.addEventListener("message", fromWorker);
    return () => navigator.serviceWorker.removeEventListener("message", fromWorker);
  }, [enabled, navigate]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const feed = await getOwnerFeed(since.current, controller.signal);
        if (!alive) return;
        since.current = feed.now;
        if (!browserNotifyOn()) return;
        // Oldest first, so they stack in the order they happened; at most 5 at once (then one summary).
        const fresh = feed.items.filter((i) => !shown.current.has(i.id)).reverse();
        fresh.forEach((i) => shown.current.add(i.id));
        fresh.slice(0, 5).forEach((i) => showNotification(i.title, i.body, i.id, i.link, () => navigate(i.link)));
        if (fresh.length > 5) {
          showNotification(`${fresh.length - 5} more updates in Zinwe`, "Open Zinwe to see them all.", "zinwe-more");
        }
      } catch {
        // Offline or signed out: try again next round.
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(id);
    };
  }, [enabled, navigate]);
}

const TITLE_COUNT = /^\((?:\d+|9\+)\) /;

/** The favicon with CompNotify's red dot (top right, white ring), drawn once per page load. */
let dotted: Promise<string> | null = null;
function dottedIcon(src: string): Promise<string> {
  dotted ??= new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 32;
      const g = c.getContext("2d");
      if (!g) {
        reject(new Error("no canvas"));
        return;
      }
      g.drawImage(img, 0, 0, 32, 32);
      g.beginPath();
      g.arc(24, 8, 8, 0, Math.PI * 2);
      g.fillStyle = "#fff";
      g.fill();
      g.beginPath();
      g.arc(24, 8, 6, 0, Math.PI * 2);
      g.fillStyle = "#C0331C";
      g.fill();
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("no icon"));
    img.src = src;
  });
  return dotted;
}

function iconLinks(): HTMLLinkElement[] {
  return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
}

/**
 * CompNotify "In the browser tab": while something needs the owner, the tab title reads "(3) Zinwe · Overview"
 * (above 9: "(9+)") and the icon gets a red dot, so a background tab still says so. Count = unread chat + tasks
 * needing you + alerts that need you. Notifications switched off in Settings: no count and no dot. Pages keep
 * setting their own titles; the count is laid on top of whatever they set.
 */
export function useTabBadge(count: number): void {
  const [off, setOff] = useState(browserNotifySwitchedOff);
  useEffect(() => {
    const sync = () => setOff(browserNotifySwitchedOff());
    window.addEventListener(NOTIFY_SWITCH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NOTIFY_SWITCH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const n = off ? 0 : Math.max(0, count);

  // Title.
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(TITLE_COUNT, "");
      const want = n > 0 ? `(${n > 9 ? "9+" : n}) ${base}` : base;
      if (document.title !== want) document.title = want;
    };
    apply();
    const title = document.querySelector("title");
    const watch = title ? new MutationObserver(apply) : null;
    if (title) watch?.observe(title, { childList: true, characterData: true, subtree: true });
    return () => {
      watch?.disconnect();
      document.title = document.title.replace(TITLE_COUNT, "");
    };
  }, [n]);

  // Icon dot.
  useEffect(() => {
    if (n === 0) return;
    let alive = true;
    const links = iconLinks();
    const png = links.find((l) => l.type === "image/png") ?? links[0];
    if (!png) return;
    dottedIcon(png.dataset.zfHref ?? png.href)
      .then((url) => {
        if (!alive) return;
        for (const l of iconLinks()) {
          l.dataset.zfHref ??= l.href;
          l.href = url;
        }
      })
      .catch(() => {
        /* no icon to draw on: the title count still shows */
      });
    return () => {
      alive = false;
      for (const l of iconLinks()) {
        if (l.dataset.zfHref) {
          l.href = l.dataset.zfHref;
          delete l.dataset.zfHref;
        }
      }
    };
  }, [n]);
}
