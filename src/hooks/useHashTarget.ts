import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lazy pages (Product, Legal, Download) render after the layout's useScrollOnNavigate has already looked for the
 * #anchor and scrolled to the top. Once the page has mounted, bring the anchored section into view (fresh loads and
 * links from other pages: /product#tasks, /legal#refunds). Same-page hash links are still handled by the layout.
 */
export function useHashTarget(): void {
  const { hash } = useLocation();
  // The anchor the page was opened with (later same-page anchor clicks are the layout's job).
  const first = useRef(hash);
  useEffect(() => {
    const hash = first.current;
    if (!hash) return;
    let tries = 0;
    let frame = 0;
    const go = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "start" });
        return;
      }
      if (tries++ < 30) frame = window.requestAnimationFrame(go);
    };
    frame = window.requestAnimationFrame(go);
    return () => window.cancelAnimationFrame(frame);
  }, []);
}
