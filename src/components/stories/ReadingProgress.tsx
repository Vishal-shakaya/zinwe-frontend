import { useEffect, useRef, type ReactElement, type RefObject } from "react";
import { cx } from "../../lib/cx";

/**
 * A 3 px reading-progress hint fixed to the top of the window: how far through `target` the reader is. It moves by
 * transform only (no layout, no shift) and is decorative, so screen readers skip it.
 */
export function ReadingProgress({ target, tone = "light" }: { target: RefObject<HTMLElement | null>; tone?: "light" | "dark" }): ReactElement {
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = target.current;
      const b = bar.current;
      if (!el || !b) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight * 0.6;
      const done = span <= 0 ? (r.top < 0 ? 1 : 0) : Math.min(1, Math.max(0, -r.top / span));
      b.style.transform = `scaleX(${done})`;
      b.parentElement?.classList.toggle("is-on", r.top < window.innerHeight * 0.4 && done < 1);
    };
    const queue = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <span className={cx("zst-progress", `zst-progress--${tone}`)} aria-hidden="true">
      <span ref={bar} className="zst-progress__bar" />
    </span>
  );
}
