/*
 * Zinwe's service worker (FR-15): shows what the server pushes, with the dashboard closed and on Android, and opens the
 * right page when a notification is clicked. The server is z_devices/web_push.py; a push is
 * {id, title, body, link}, a feed item, and its id is the tag, so the dashboard's 30-second poll replaces it instead of
 * showing it twice. Registered from the dashboard only (lib/webPush.ts), and it has no fetch handler on purpose: it
 * caches nothing and never sits between the website and the network. A plain file: it isn't bundled and can't import.
 */

const ICON = "/icon-192.png";
const HOME = "/app";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function dashboardTabs() {
  return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((tabs) =>
    tabs.filter((tab) => {
      const { pathname } = new URL(tab.url);
      return pathname === HOME || pathname.startsWith(`${HOME}/`);
    }),
  );
}

/** Only ever a page of this site. */
function pageOf(link) {
  try {
    const url = new URL(link, self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search + url.hash : HOME;
  } catch {
    return HOME;
  }
}

async function showPush(item) {
  const tag = item.id || "zinwe-more";
  // A push must show something, or the browser says "this site was updated in the background" for us.
  await self.registration.showNotification(item.title || "Zinwe", {
    body: item.body || "Open Zinwe to see what's new.",
    tag,
    icon: ICON,
    data: { link: pageOf(item.link || HOME) },
  });
  // If the owner swipes this away within 30 seconds, an open tab's poll mustn't bring it back: it now knows the id.
  for (const tab of await dashboardTabs()) tab.postMessage({ type: "zinwe-push", id: tag });
}

self.addEventListener("push", (event) => {
  let item = {};
  try {
    item = event.data.json();
  } catch {
    // Nothing readable: still show the plain line.
  }
  event.waitUntil(showPush(item));
});

/** A tab that's open comes to the front and moves there itself, keeping its state; otherwise a new one opens. */
async function open(link) {
  const [tab] = await dashboardTabs();
  if (!tab) {
    await self.clients.openWindow(link ?? HOME);
    return;
  }
  await tab.focus().catch(() => null);
  if (link) tab.postMessage({ type: "zinwe-open", link });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link;
  event.waitUntil(open(link ? pageOf(link) : null));
});
