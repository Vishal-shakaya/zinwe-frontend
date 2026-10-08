import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { cx } from "../../lib/cx";

interface StickyCtaProps {
  /** The hero CTA row; the bar slides in once it has scrolled above the viewport. */
  target: HTMLElement;
}

/** Mobile-only (CSS: <=760px) "Reserve" bar pinned to the bottom of the home page. */
export function StickyCta({ target }: StickyCtaProps): ReactElement {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    document.body.classList.add("has-sticky");
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    io.observe(target);
    return () => {
      io.disconnect();
      document.body.classList.remove("has-sticky");
    };
  }, [target]);

  return (
    <div className={cx("sticky-cta", show && "is-on")} aria-hidden={!show}>
      <span>Full plan, free for 3 months</span>
      <Link className="btn btn--primary" to="/early-access" tabIndex={show ? undefined : -1}>
        Reserve
      </Link>
    </div>
  );
}
