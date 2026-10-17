import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { identifyUser, startAnalytics, stopAnalytics, trackPageView } from "../lib/analytics";
import { COOKIE_CHOICE_EVENT, analyticsAllowed } from "../lib/cookieConsent";

/**
 * Starts Google Analytics when the visitor has allowed it (now or later in the cookie sheet), stops it when
 * they switch it off, and sends a page view on every route change. Renders nothing.
 *
 * The address is captured when the route changes: some pages tidy their own URL right away (e.g. /plans drops
 * ?plan= after reading it), and campaign tags (utm_*) must still reach GA with the first view. Such a tidy-up
 * (a replace to the same path) isn't counted as another view.
 * Each page view also tells Microsoft Clarity where the visitor is (it records public pages only).
 * The signed-in owner is identified to PostHog by internal id only; signing out resets it.
 */
export function AnalyticsTracker(): null {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const lastPath = useRef<string | null>(null);
  const userId = useAuth().user?.id ?? null;
  const identified = useRef<number | null>(null);

  // Signed in -> identify; signed out after being identified -> reset (never reset an anonymous visitor).
  useEffect(() => {
    const sync = () => {
      if (!startAnalytics()) return;
      if (userId !== null && identified.current !== userId) identifyUser(userId);
      else if (userId === null && identified.current !== null) identifyUser(null);
      identified.current = userId;
    };
    sync();
    window.addEventListener(COOKIE_CHOICE_EVENT, sync);
    return () => window.removeEventListener(COOKIE_CHOICE_EVENT, sync);
  }, [userId]);

  useEffect(() => {
    const onChoice = () => {
      if (analyticsAllowed()) {
        if (startAnalytics()) {
          lastPath.current = window.location.pathname;
          trackPageView(window.location.href);
        }
      } else {
        stopAnalytics();
      }
    };
    window.addEventListener(COOKIE_CHOICE_EVENT, onChoice);
    return () => window.removeEventListener(COOKIE_CHOICE_EVENT, onChoice);
  }, []);

  useEffect(() => {
    if (!startAnalytics()) return;
    if (navigationType === "REPLACE" && pathname === lastPath.current) return;
    lastPath.current = pathname;
    const href = window.location.origin + pathname + search;
    // After the page has set its own <title> (usePageMeta runs in the page's effect, lazy pages a bit later).
    window.setTimeout(() => trackPageView(href), 0);
  }, [pathname, search, navigationType]);

  return null;
}
