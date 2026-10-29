import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext";
import { cx } from "../../lib/cx";

interface StickyCtaProps {
  /** The page's hero button row; the bar slides in once it has scrolled above the viewport. */
  target: HTMLElement;
}

/**
 * Phone-only (CSS: ≤ 760 px) "Start free" bar pinned to the bottom of Home and Product (website v3, v1.3.1).
 * It shows only after the hero buttons have scrolled away, hides again while the footer is on screen (the footer
 * has its own Start free) and while the cookie sheet is open, and never for a signed-in owner. The page gets
 * bottom padding while it can show, so it never covers the last lines of content.
 */
export function StickyCta({ target }: StickyCtaProps): ReactElement | null {
  const { token } = useAuth();
  const [pastHero, setPastHero] = useState(false);
  const [footerOn, setFooterOn] = useState(false);

  useEffect(() => {
    if (token || !("IntersectionObserver" in window)) return;
    document.body.classList.add("has-zs-sticky");
    const hero = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    hero.observe(target);
    const foot = document.querySelector(".zs-foot");
    const footer = new IntersectionObserver(([e]) => setFooterOn(e.isIntersecting), { threshold: 0 });
    if (foot) footer.observe(foot);
    return () => {
      hero.disconnect();
      footer.disconnect();
      document.body.classList.remove("has-zs-sticky");
    };
  }, [target, token]);

  if (token) return null;
  const show = pastHero && !footerOn;
  return (
    <div className={cx("zs-sticky", show && "is-on")} aria-hidden={!show}>
      <span className="zs-sticky__t">
        <b>Free for up to 3 PCs</b>
        <span>No card needed</span>
      </span>
      <Link className="zs-btn zs-btn--pri zs-btn--flat zs-sticky__btn" to="/signup?plan=free" tabIndex={show ? undefined : -1}>
        Start free
      </Link>
    </div>
  );
}
