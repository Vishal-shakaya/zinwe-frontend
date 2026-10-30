import { useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/cx";

/**
 * A horizontal scroll-snap rail (v1.3.2 stories): the next card peeks in, swipe on a phone, arrow buttons on a
 * desktop pointer, and the keyboard works too (Tab walks the cards and scrolls them into view; the rail itself is
 * focusable, so ← / → scroll it). No scroll-jacking; smooth scrolling only when motion is welcome.
 */
export function Rail({
  title,
  note,
  more,
  children,
  tone = "dark",
  className,
}: {
  title: ReactNode;
  /** A quiet line beside the title (a season's theme, a date). */
  note?: ReactNode;
  /** "See all" link. */
  more?: { to: string; label: string };
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}): ReactElement {
  const id = useId();
  const ref = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });
  const [fits, setFits] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEnds({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
    setFits(max <= 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.86), behavior: still ? "auto" : "smooth" });
  };

  return (
    <section className={cx("zst-rail", `zst-rail--${tone}`, className)} aria-labelledby={`${id}-t`}>
      <div className="zst-rail__head">
        <h2 id={`${id}-t`} className="zst-rail__t">
          {title}
        </h2>
        {note ? <span className="zst-rail__note">{note}</span> : null}
        <span className="zst-rail__acts">
          {more ? (
            <Link className="zst-rail__more" to={more.to}>
              {more.label}
            </Link>
          ) : null}
          <span className="zst-rail__arrows" hidden={fits}>
            <button type="button" className="zst-rail__arrow" aria-label="Scroll back" aria-controls={`${id}-l`} disabled={ends.start} onClick={() => page(-1)}>
              <Chevron dir="left" />
            </button>
            <button type="button" className="zst-rail__arrow" aria-label="Scroll on" aria-controls={`${id}-l`} disabled={ends.end} onClick={() => page(1)}>
              <Chevron dir="right" />
            </button>
          </span>
        </span>
      </div>
      {/* The list scrolls; tabIndex lets keyboard users scroll it with the arrow keys. */}
      <ul id={`${id}-l`} ref={ref} className="zst-rail__list" data-rail="" tabIndex={0} aria-labelledby={`${id}-t`}>
        {children}
      </ul>
    </section>
  );
}

export function Chevron({ dir }: { dir: "left" | "right" }): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={dir === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
