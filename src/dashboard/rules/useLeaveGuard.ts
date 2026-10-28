import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/** Where a held navigation was going: an in-app path, or the browser's Back. */
export type LeaveTarget = { kind: "link"; to: string } | { kind: "back" };

const MARK = "zRulesGuard";

function marked(): boolean {
  const s: unknown = window.history.state;
  return typeof s === "object" && s !== null && (s as Record<string, unknown>)[MARK] === true;
}

/**
 * Leave-page guard for unsaved changes. The app uses <BrowserRouter> (no data router, so no useBlocker), so:
 * - a capture-phase click listener on the document holds any in-app <a href> click and reports where it went;
 * - Back: while dirty, one extra history entry (same URL) sits on top, so Back lands on this page again and is
 *   reported as { kind: "back" } — Stay puts the entry back, leaving goes back once more;
 * - reload / close / typing a new address: the browser's own beforeunload prompt.
 * Elements inside `[data-leave-guard]` (the guard's own buttons and links) pass through.
 */
export function useLeaveGuard(dirty: boolean): {
  target: LeaveTarget | null;
  stay: () => void;
  /** About to leave (e.g. saving first): don't take the extra Back entry away meanwhile. */
  hold: () => void;
  /** Go on to where the held navigation was going (call after saving or discarding). */
  proceed: () => void;
} {
  const navigate = useNavigate();
  const [target, setTarget] = useState<LeaveTarget | null>(null);
  const dirtyRef = useRef(dirty);
  const leaving = useRef(false);
  /** This page pushed the extra entry (so it may take it away again). */
  const pushed = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Links (menu, bell, top bar, anything on the page).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = e.target instanceof Element ? e.target : null;
      const a = el?.closest<HTMLAnchorElement>("a[href]");
      if (!a || a.closest("[data-leave-guard]")) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href || href.startsWith("#")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // beforeunload covers leaving the site
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setTarget({ kind: "link", to: url.pathname + url.search + url.hash });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Reload / close.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  // Back: an extra entry while dirty; consumed again when the changes are saved or discarded here.
  useEffect(() => {
    if (dirty) {
      if (!marked()) {
        window.history.pushState({ ...(window.history.state as object | null), [MARK]: true }, "", window.location.href);
        pushed.current = true;
      }
    } else if (pushed.current && marked() && !leaving.current) {
      pushed.current = false;
      window.history.back();
    }
  }, [dirty]);

  useEffect(() => {
    const onPop = () => {
      if (dirtyRef.current && pushed.current && !marked() && !leaving.current) {
        pushed.current = false;
        setTarget({ kind: "back" });
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const hold = useCallback(() => {
    leaving.current = true;
  }, []);

  const stay = useCallback(() => {
    leaving.current = false;
    setTarget((t) => {
      if (t?.kind === "back" && dirtyRef.current && !marked()) {
        window.history.pushState({ ...(window.history.state as object | null), [MARK]: true }, "", window.location.href);
        pushed.current = true;
      }
      return null;
    });
  }, []);

  const proceed = useCallback(() => {
    const t = target;
    setTarget(null);
    if (!t) return;
    leaving.current = true;
    // The extra entry (same URL) is replaced by the page clicked, so Back from there comes straight here.
    if (t.kind === "link") navigate(t.to, { replace: marked() });
    else window.history.back();
  }, [navigate, target]);

  return { target, stay, hold, proceed };
}
