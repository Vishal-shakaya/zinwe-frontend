import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getOwnerFeed } from "../../lib/api";
import { browserNotifyOn, showNotification } from "./browserNotify";

const POLL_MS = 30_000;

/**
 * FR-15: while the dashboard is open (even in a background tab), ask every 30 s what's new — member replies,
 * alerts, requests waiting for the owner's OK — and show each as a browser notification. Clicking one opens the
 * right page. Does nothing until notifications are switched on in Profile → Notifications.
 */
export function useOwnerNotifications(enabled: boolean): void {
  const navigate = useNavigate();
  const since = useRef<string | null>(null);
  const shown = useRef(new Set<string>());

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
        fresh.slice(0, 5).forEach((i) => showNotification(i.title, i.body, i.id, () => navigate(i.link)));
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
