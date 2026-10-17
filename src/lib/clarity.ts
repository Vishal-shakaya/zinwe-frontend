/**
 * Microsoft Clarity (heatmaps + session replays), under the same rules as Google Analytics (lib/analytics.ts):
 * production site only, only after the visitor allows analytics in the cookie sheet.
 *
 * Clarity sees the PUBLIC website only. It's loaded on the first public page and paused on every private area —
 * the dashboard, onboarding, sign-in/sign-up, password reset, shared quotes, newsletter links (the same list
 * search engines are kept out of: NOINDEX_PREFIXES) — and resumed when the visitor comes back to a public page.
 * As a second line of defence those screens also carry data-clarity-mask="true" (their text is masked even if a
 * recording ever ran there). Set the project's masking mode to "Strict" in Clarity → Settings → Masking.
 */
import { isNoindex } from "../content/seo";

const CLARITY_ID = "yz9765ak72";

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

let loaded = false;
let on = false;

function clarity(...args: unknown[]): void {
  window.clarity?.(...args);
}

function load(): void {
  if (loaded) return;
  loaded = true;
  // Microsoft's snippet: a queue until the real script arrives.
  const queued: ClarityFn = (...args: unknown[]) => {
    (queued.q = queued.q ?? []).push(args);
  };
  window.clarity = window.clarity ?? queued;
  clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
  document.head.appendChild(script);
}

/** Analytics allowed: follow the visitor's route (record public pages, pause private ones). */
export function clarityRoute(pathname: string): void {
  const isPublic = !isNoindex(pathname) && !pathname.startsWith("/quote");
  if (isPublic) {
    if (!loaded) load();
    else if (!on) clarity("resume");
    on = true;
  } else if (loaded && on) {
    clarity("pause");
    on = false;
  }
}

/** Analytics switched off: stop recording, withdraw consent, delete Clarity's cookies. */
export function stopClarity(): void {
  if (loaded) {
    clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
    clarity("stop");
    on = false;
    loaded = false; // a later "allow" loads a fresh session
  }
  const host = window.location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const name of document.cookie.split(";").map((c) => c.split("=")[0].trim())) {
    if (!["_clck", "_clsk", "CLID", "MUID"].includes(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}
