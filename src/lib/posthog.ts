/**
 * PostHog product analytics (funnels and activation), under the same rules as Google Analytics (lib/analytics.ts):
 * production site only, only after the visitor allows analytics in the cookie sheet, loaded on demand (the SDK
 * isn't in the page until then), cleaned addresses, no personal data.
 *
 * - No autocapture, no session recording, no surveys: only page views and the named events we send, so nothing
 *   from the dashboard (employee names, alerts, files) can leave by accident. (Session replays of the public site
 *   come from Microsoft Clarity, lib/clarity.ts.)
 * - Signed-in owners are identified by "user-<id>" (their internal account number), never by email or name.
 * - Turning analytics off opts out (and stops sending); turning it on again opts back in.
 *
 * The project key ("phc_…") is public by design: it can only send events, not read them.
 */
import type { CaptureResult, PostHog } from "posthog-js";

/** PostHog project "Zinwe" (id 670843), US Cloud. */
const POSTHOG_KEY = "phc_rdVLaDeHiRtRu7r7TNG8UxVeUJvSmwCSPzVFvhdZxvaJ";
const POSTHOG_HOST = "https://us.i.posthog.com";

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
let optedOut = false;
/** Calls made while the SDK is still loading, replayed once it's ready. */
const queue: Array<(ph: PostHog) => void> = [];

function run(fn: (ph: PostHog) => void): void {
  if (optedOut) return;
  if (client) fn(client);
  else if (loading) queue.push(fn);
}

/** Clean every address-like property (current URL, referrer, path), including $set / $set_once. */
function cleanProperties(props: Record<string, unknown> | undefined, clean: (href: string) => string): void {
  if (!props) return;
  for (const key of Object.keys(props)) {
    const value = props[key];
    if (typeof value !== "string" || !/(url|referrer|pathname)$/i.test(key)) continue;
    try {
      if (key.toLowerCase().endsWith("pathname")) {
        props[key] = new URL(clean(window.location.origin + value)).pathname;
      } else if (value.startsWith(window.location.origin)) {
        props[key] = clean(value);
      }
    } catch {
      /* not a URL: leave it */
    }
  }
}

/** Load and start PostHog (once). `clean` is the shared URL cleaner from analytics.ts. */
export function startPosthog(clean: (href: string) => string): void {
  optedOut = false;
  if (client) {
    client.opt_in_capturing();
    return;
  }
  if (loading) return;
  loading = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false, // AnalyticsTracker sends one per route, with a cleaned address
        capture_pageleave: true,
        autocapture: false,
        disable_session_recording: true,
        disable_surveys: true,
        persistence: "localStorage+cookie",
        before_send: (event: CaptureResult | null) => {
          if (!event) return null;
          cleanProperties(event.properties, clean);
          cleanProperties(event.$set, clean);
          cleanProperties(event.$set_once, clean);
          return event;
        },
      });
      client = posthog;
      for (const fn of queue.splice(0)) fn(posthog);
      return posthog;
    })
    .catch(() => {
      loading = null; // blocked by an ad blocker or offline: just no product analytics
      queue.length = 0;
      return null;
    });
}

export function stopPosthog(): void {
  optedOut = true;
  queue.length = 0;
  if (client) client.opt_out_capturing();
}

export function posthogPageView(cleanedHref: string): void {
  run((ph) => ph.capture("$pageview", { $current_url: cleanedHref }));
}

export function posthogEvent(name: string, params: Record<string, string | number | boolean>): void {
  run((ph) => ph.capture(name, params));
}

/** The signed-in owner: an internal id only (no email, no name). */
export function posthogIdentify(userId: number): void {
  run((ph) => {
    const id = `user-${userId}`;
    if (ph.get_distinct_id() !== id) ph.identify(id);
  });
}

/** Signed out: forget the person on this browser (a new anonymous id). */
export function posthogReset(): void {
  run((ph) => ph.reset());
}
