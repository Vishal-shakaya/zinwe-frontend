/**
 * Google Analytics 4 for the website and dashboard (Cookie Policy: analytics only with the visitor's OK).
 *
 * - Loads Google's tag only on the production site (zinwe.io) and only after the visitor allows analytics in
 *   the cookie sheet; switching analytics off stops it and deletes the _ga cookies. Local and dev never load it
 *   (VITE_GA_DEBUG=1 turns it on anywhere, for testing the tag).
 * - Page views are sent by <AnalyticsTracker /> on every route change (it's a single-page app, so GA's own
 *   automatic page view would only see the first page).
 * - Never sent: names, emails, form contents, or private codes in addresses. URLs are cleaned first: /quote/<code>
 *   and /app/invoice/<id> are collapsed, and query strings keep only campaign tags (utm_*, gclid) and ?plan=.
 * - Ads features are off: Google signals, ad personalisation and ad storage are disabled.
 * - Microsoft Clarity (lib/clarity.ts) rides on the same switch, public pages only: it follows each page view.
 * - PostHog (lib/posthog.ts) too: started, stopped, fed page views, events and the signed-in owner's id here.
 */
import { analyticsAllowed } from "./cookieConsent";
import { clarityRoute, stopClarity } from "./clarity";
import { posthogEvent, posthogIdentify, posthogPageView, posthogReset, startPosthog, stopPosthog } from "./posthog";

const GA_ID = "G-8ZH4TZ3NTG";
const PRODUCTION_HOSTS = ["zinwe.io", "www.zinwe.io"];
/** About 13 months, instead of GA's 2-year default. */
const COOKIE_EXPIRES_SECONDS = 60 * 60 * 24 * 395;
const KEPT_PARAMS = /^(utm_[a-z_]+|gclid|plan)$/;
/** Path pieces that are private codes or record ids, replaced before measuring. */
const PRIVATE_SEGMENTS: ReadonlyArray<[RegExp, string]> = [
  [/^\/quote\/[^/]+/, "/quote/:code"],
  [/^\/app\/invoice\/[^/]+/, "/app/invoice/:id"],
];

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** The tag has been loaded (once per page load). */
let started = false;
/** Sending is on: false after the visitor switches analytics off (until they switch it on again). */
let enabled = false;

function enabledHere(): boolean {
  return PRODUCTION_HOSTS.includes(window.location.hostname) || import.meta.env.VITE_GA_DEBUG === "1";
}

/** gtag must push the `arguments` object itself, not an array (Google's tag checks for it). */
function gtag(..._args: unknown[]): void {
  window.dataLayer = window.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

/** The address as it's measured: private codes collapsed, only campaign tags kept. */
export function cleanUrl(href: string): string {
  const url = new URL(href);
  let path = url.pathname;
  for (const [pattern, replacement] of PRIVATE_SEGMENTS) path = path.replace(pattern, replacement);
  const kept = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (KEPT_PARAMS.test(key)) kept.append(key, value);
  });
  const query = kept.toString();
  return `${url.origin}${path}${query ? `?${query}` : ""}`;
}

/** Load the tag once, if this is the production site and the visitor allowed analytics. */
export function startAnalytics(): boolean {
  if (!enabledHere() || !analyticsAllowed()) return false;
  if (enabled) return true;
  enabled = true;
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = false;
  startPosthog(cleanUrl);
  if (started) {
    // Switched back on after an opt-out in this page load: the tag is already here.
    gtag("consent", "update", { analytics_storage: "granted" });
    return true;
  }
  started = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = gtag;
  gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  gtag("js", new Date());
  gtag("config", GA_ID, {
    send_page_view: false, // AnalyticsTracker sends one per route, with a cleaned address
    page_location: cleanUrl(window.location.href),
    cookie_expires: COOKIE_EXPIRES_SECONDS,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  return true;
}

/** Analytics switched off: stop sending and delete the GA cookies (on zinwe.io and the bare host). */
export function stopAnalytics(): void {
  enabled = false;
  stopClarity();
  stopPosthog();
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true;
  if (started) gtag("consent", "update", { analytics_storage: "denied" });
  const host = window.location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/** One page view. `href`: the address when the route changed (default: now). */
export function trackPageView(href: string = window.location.href): void {
  if (!enabled) return;
  const location = cleanUrl(href);
  gtag("event", "page_view", { page_location: location, page_title: document.title });
  posthogPageView(location);
  clarityRoute(new URL(href).pathname);
}

/**
 * A conversion or key action, sent only after it succeeded (GA4 recommended names: sign_up, login,
 * generate_lead). Params must never carry personal data.
 */
export function trackEvent(name: string, params: Record<string, string | number | boolean> = {}): void {
  if (!enabled) return;
  gtag("event", name, { ...params, page_location: cleanUrl(window.location.href) });
  posthogEvent(name, params);
}

/** The signed-in owner (PostHog only, by internal id; GA and Clarity never get one). Null = signed out. */
export function identifyUser(userId: number | null): void {
  if (!enabled) return;
  if (userId === null) posthogReset();
  else posthogIdentify(userId);
}
