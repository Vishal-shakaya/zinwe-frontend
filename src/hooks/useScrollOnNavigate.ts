import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { prefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Multi-page behaviour for a SPA: every navigation starts at the top of the
 * page, unless the URL has a hash (e.g. /#how), in which case that section is
 * scrolled into view. Same-page hash links scroll smoothly; arriving from
 * another page jumps, like a fresh page load would.
 */
export function useScrollOnNavigate(): void {
  const { pathname, hash, key } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const samePage = lastPath.current === pathname;
    lastPath.current = pathname;

    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        const smooth = samePage && !prefersReducedMotion();
        el.scrollIntoView({ behavior: smooth ? "smooth" : "instant", block: "start" });
        return;
      }
    }
    // `instant` overrides `html { scroll-behavior: smooth }` from site.css.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, key]);
}
